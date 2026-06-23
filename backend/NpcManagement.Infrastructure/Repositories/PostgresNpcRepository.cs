using System.Text.Json;
using Npgsql;
using NpgsqlTypes;
using NpcManagement.Domain.Entities;
using NpcManagement.Domain.Repositories;

namespace NpcManagement.Infrastructure.Repositories;

public class PostgresNpcRepository(NpgsqlDataSource dataSource) : INpcRepository
{
    // Match the camelCase JSON the API speaks, so the jsonb column is queryable
    // with the same field names clients see.
    private static readonly JsonSerializerOptions JsonOptions = JsonSerializerOptions.Web;

    private const string Columns =
        "id, name, role, location_id, level, is_hostile, notes, likes, dislikes, " +
        "goals, current_hit_points, max_hit_points, stat_block, portrait, " +
        "portrait_seed, race, gender, age, skin_color, appearance_details, " +
        "created_at, user_id";

    public async Task<IReadOnlyList<Npc>> GetAllAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var cmd = dataSource.CreateCommand(
            $"SELECT {Columns} FROM npc.npcs WHERE user_id = $1 ORDER BY created_at");
        cmd.Parameters.AddWithValue(userId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

        var npcs = new List<Npc>();
        while (await reader.ReadAsync(cancellationToken))
        {
            npcs.Add(Map(reader));
        }

        return npcs;
    }

    public async Task<Npc?> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        await using var cmd = dataSource.CreateCommand(
            $"SELECT {Columns} FROM npc.npcs WHERE id = $1 AND user_id = $2");
        cmd.Parameters.AddWithValue(id);
        cmd.Parameters.AddWithValue(userId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

        return await reader.ReadAsync(cancellationToken) ? Map(reader) : null;
    }

    public async Task<Npc> AddAsync(Npc npc, CancellationToken cancellationToken = default)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        await using (var cmd = new NpgsqlCommand(
            $"INSERT INTO npc.npcs ({Columns}) " +
            "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, " +
            "$15, $16, $17, $18, $19, $20, $21, $22)", connection, transaction))
        {
            AddParameters(cmd, npc);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }

        await SyncLocationLinkAsync(connection, transaction, npc, cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return npc;
    }

    public async Task<bool> UpdateAsync(Npc npc, CancellationToken cancellationToken = default)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        int rows;
        // user_id is never reassigned; $22 is used only to scope the update to the
        // owner, so a user can't modify someone else's NPC.
        await using (var cmd = new NpgsqlCommand(
            "UPDATE npc.npcs SET " +
            "name = $2, role = $3, location_id = $4, level = $5, is_hostile = $6, " +
            "notes = $7, likes = $8, dislikes = $9, goals = $10, " +
            "current_hit_points = $11, max_hit_points = $12, stat_block = $13, " +
            "portrait = $14, portrait_seed = $15, race = $16, gender = $17, " +
            "age = $18, skin_color = $19, appearance_details = $20, created_at = $21 " +
            "WHERE id = $1 AND user_id = $22", connection, transaction))
        {
            AddParameters(cmd, npc);
            rows = await cmd.ExecuteNonQueryAsync(cancellationToken);
        }

        if (rows == 0)
        {
            await transaction.RollbackAsync(cancellationToken);
            return false;
        }

        await SyncLocationLinkAsync(connection, transaction, npc, cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return true;
    }

    // Keep npc.npc_locations in step with the NPC's location: upsert the link when a
    // location is set, drop it when the NPC has none.
    private static async Task SyncLocationLinkAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        Npc npc,
        CancellationToken cancellationToken)
    {
        if (npc.LocationId is { } locationId)
        {
            await using var cmd = new NpgsqlCommand(
                "INSERT INTO npc.npc_locations (npc_id, location_id) VALUES ($1, $2) " +
                "ON CONFLICT (npc_id) DO UPDATE SET location_id = EXCLUDED.location_id",
                connection, transaction);
            cmd.Parameters.AddWithValue(npc.Id);
            cmd.Parameters.AddWithValue(locationId);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
        else
        {
            await using var cmd = new NpgsqlCommand(
                "DELETE FROM npc.npc_locations WHERE npc_id = $1", connection, transaction);
            cmd.Parameters.AddWithValue(npc.Id);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        await using var cmd = dataSource.CreateCommand(
            "DELETE FROM npc.npcs WHERE id = $1 AND user_id = $2");
        cmd.Parameters.AddWithValue(id);
        cmd.Parameters.AddWithValue(userId);
        var rows = await cmd.ExecuteNonQueryAsync(cancellationToken);

        return rows > 0;
    }

    private static void AddParameters(NpgsqlCommand cmd, Npc npc)
    {
        cmd.Parameters.AddWithValue(npc.Id);
        cmd.Parameters.AddWithValue(npc.Name);
        cmd.Parameters.AddWithValue((object?)npc.Role ?? DBNull.Value);
        cmd.Parameters.AddWithValue((object?)npc.LocationId ?? DBNull.Value);
        cmd.Parameters.AddWithValue(npc.Level);
        cmd.Parameters.AddWithValue(npc.IsHostile);
        cmd.Parameters.AddWithValue((object?)npc.Notes ?? DBNull.Value);
        cmd.Parameters.AddWithValue((object?)npc.Likes ?? DBNull.Value);
        cmd.Parameters.AddWithValue((object?)npc.Dislikes ?? DBNull.Value);
        cmd.Parameters.AddWithValue((object?)npc.Goals ?? DBNull.Value);
        cmd.Parameters.AddWithValue((object?)npc.CurrentHitPoints ?? DBNull.Value);
        cmd.Parameters.AddWithValue((object?)npc.MaxHitPoints ?? DBNull.Value);
        cmd.Parameters.Add(new NpgsqlParameter
        {
            NpgsqlDbType = NpgsqlDbType.Jsonb,
            Value = npc.StatBlock is null
                ? DBNull.Value
                : JsonSerializer.Serialize(npc.StatBlock, JsonOptions),
        });
        cmd.Parameters.AddWithValue((object?)npc.Portrait ?? DBNull.Value);
        cmd.Parameters.AddWithValue((object?)npc.PortraitSeed ?? DBNull.Value);
        cmd.Parameters.AddWithValue((object?)npc.Race ?? DBNull.Value);
        cmd.Parameters.AddWithValue((object?)npc.Gender ?? DBNull.Value);
        cmd.Parameters.AddWithValue((object?)npc.Age ?? DBNull.Value);
        cmd.Parameters.AddWithValue((object?)npc.SkinColor ?? DBNull.Value);
        cmd.Parameters.AddWithValue((object?)npc.AppearanceDetails ?? DBNull.Value);
        cmd.Parameters.AddWithValue(npc.CreatedAt);
        cmd.Parameters.AddWithValue(npc.UserId);
    }

    private static Npc Map(NpgsqlDataReader reader) => new()
    {
        Id = reader.GetGuid(0),
        UserId = reader.GetGuid(21),
        Name = reader.GetString(1),
        Role = reader.IsDBNull(2) ? null : reader.GetString(2),
        LocationId = reader.IsDBNull(3) ? null : reader.GetGuid(3),
        Level = reader.GetInt32(4),
        IsHostile = reader.GetBoolean(5),
        Notes = reader.IsDBNull(6) ? null : reader.GetString(6),
        Likes = reader.IsDBNull(7) ? null : reader.GetString(7),
        Dislikes = reader.IsDBNull(8) ? null : reader.GetString(8),
        Goals = reader.IsDBNull(9) ? null : reader.GetString(9),
        CurrentHitPoints = reader.IsDBNull(10) ? null : reader.GetInt32(10),
        MaxHitPoints = reader.IsDBNull(11) ? null : reader.GetInt32(11),
        StatBlock = reader.IsDBNull(12)
            ? null
            : JsonSerializer.Deserialize<NpcStatBlock>(reader.GetString(12), JsonOptions),
        Portrait = reader.IsDBNull(13) ? null : reader.GetString(13),
        PortraitSeed = reader.IsDBNull(14) ? null : reader.GetInt64(14),
        Race = reader.IsDBNull(15) ? null : reader.GetString(15),
        Gender = reader.IsDBNull(16) ? null : reader.GetString(16),
        Age = reader.IsDBNull(17) ? null : reader.GetString(17),
        SkinColor = reader.IsDBNull(18) ? null : reader.GetString(18),
        AppearanceDetails = reader.IsDBNull(19) ? null : reader.GetString(19),
        CreatedAt = reader.GetFieldValue<DateTimeOffset>(20),
    };
}
