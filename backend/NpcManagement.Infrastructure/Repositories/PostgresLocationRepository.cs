using Npgsql;
using NpcManagement.Domain.Entities;
using NpcManagement.Domain.Repositories;

namespace NpcManagement.Infrastructure.Repositories;

public class PostgresLocationRepository(NpgsqlDataSource dataSource) : ILocationRepository
{
    private const string Columns = "id, name, notes, created_at, user_id";

    public async Task<IReadOnlyList<Location>> GetAllAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var cmd = dataSource.CreateCommand(
            $"SELECT {Columns} FROM npc.locations WHERE user_id = $1 ORDER BY created_at");
        cmd.Parameters.AddWithValue(userId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

        var locations = new List<Location>();
        while (await reader.ReadAsync(cancellationToken))
        {
            locations.Add(Map(reader));
        }

        return locations;
    }

    public async Task<Location?> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        await using var cmd = dataSource.CreateCommand(
            $"SELECT {Columns} FROM npc.locations WHERE id = $1 AND user_id = $2");
        cmd.Parameters.AddWithValue(id);
        cmd.Parameters.AddWithValue(userId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

        return await reader.ReadAsync(cancellationToken) ? Map(reader) : null;
    }

    public async Task<Location> AddAsync(Location location, CancellationToken cancellationToken = default)
    {
        await using var cmd = dataSource.CreateCommand(
            $"INSERT INTO npc.locations ({Columns}) VALUES ($1, $2, $3, $4, $5)");
        AddParameters(cmd, location);
        await cmd.ExecuteNonQueryAsync(cancellationToken);

        return location;
    }

    public async Task<bool> UpdateAsync(Location location, CancellationToken cancellationToken = default)
    {
        // $5 (user_id) scopes the update to the owner; it is never reassigned.
        await using var cmd = dataSource.CreateCommand(
            "UPDATE npc.locations SET name = $2, notes = $3, created_at = $4 " +
            "WHERE id = $1 AND user_id = $5");
        AddParameters(cmd, location);
        var rows = await cmd.ExecuteNonQueryAsync(cancellationToken);

        return rows > 0;
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        await using var cmd = dataSource.CreateCommand(
            "DELETE FROM npc.locations WHERE id = $1 AND user_id = $2");
        cmd.Parameters.AddWithValue(id);
        cmd.Parameters.AddWithValue(userId);
        var rows = await cmd.ExecuteNonQueryAsync(cancellationToken);

        return rows > 0;
    }

    private static void AddParameters(NpgsqlCommand cmd, Location location)
    {
        cmd.Parameters.AddWithValue(location.Id);
        cmd.Parameters.AddWithValue(location.Name);
        cmd.Parameters.AddWithValue((object?)location.Notes ?? DBNull.Value);
        cmd.Parameters.AddWithValue(location.CreatedAt);
        cmd.Parameters.AddWithValue(location.UserId);
    }

    private static Location Map(NpgsqlDataReader reader) => new()
    {
        Id = reader.GetGuid(0),
        Name = reader.GetString(1),
        Notes = reader.IsDBNull(2) ? null : reader.GetString(2),
        CreatedAt = reader.GetFieldValue<DateTimeOffset>(3),
        UserId = reader.GetGuid(4),
    };
}
