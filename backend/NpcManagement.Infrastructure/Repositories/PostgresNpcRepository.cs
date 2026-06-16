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
        "goals, current_hit_points, max_hit_points, stat_block, portrait, created_at";

    public async Task<IReadOnlyList<Npc>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        await using var cmd = dataSource.CreateCommand(
            $"SELECT {Columns} FROM npc.npcs ORDER BY created_at");
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

        var npcs = new List<Npc>();
        while (await reader.ReadAsync(cancellationToken))
        {
            npcs.Add(Map(reader));
        }

        return npcs;
    }

    public async Task<Npc?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await using var cmd = dataSource.CreateCommand(
            $"SELECT {Columns} FROM npc.npcs WHERE id = $1");
        cmd.Parameters.AddWithValue(id);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

        return await reader.ReadAsync(cancellationToken) ? Map(reader) : null;
    }

    public async Task<Npc> AddAsync(Npc npc, CancellationToken cancellationToken = default)
    {
        await using var cmd = dataSource.CreateCommand(
            $"INSERT INTO npc.npcs ({Columns}) " +
            "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)");
        AddParameters(cmd, npc);
        await cmd.ExecuteNonQueryAsync(cancellationToken);

        return npc;
    }

    public async Task<bool> UpdateAsync(Npc npc, CancellationToken cancellationToken = default)
    {
        await using var cmd = dataSource.CreateCommand(
            "UPDATE npc.npcs SET " +
            "name = $2, role = $3, location_id = $4, level = $5, is_hostile = $6, " +
            "notes = $7, likes = $8, dislikes = $9, goals = $10, " +
            "current_hit_points = $11, max_hit_points = $12, stat_block = $13, " +
            "portrait = $14, created_at = $15 " +
            "WHERE id = $1");
        AddParameters(cmd, npc);
        var rows = await cmd.ExecuteNonQueryAsync(cancellationToken);

        return rows > 0;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await using var cmd = dataSource.CreateCommand("DELETE FROM npc.npcs WHERE id = $1");
        cmd.Parameters.AddWithValue(id);
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
        cmd.Parameters.AddWithValue(npc.CreatedAt);
    }

    private static Npc Map(NpgsqlDataReader reader) => new()
    {
        Id = reader.GetGuid(0),
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
        CreatedAt = reader.GetFieldValue<DateTimeOffset>(14),
    };
}
