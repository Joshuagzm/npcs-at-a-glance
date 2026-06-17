using Npgsql;
using NpcManagement.Domain.Entities;
using NpcManagement.Domain.Repositories;

namespace NpcManagement.Infrastructure.Repositories;

public class PostgresLocationRepository(NpgsqlDataSource dataSource) : ILocationRepository
{
    private const string Columns = "id, name, notes, created_at";

    public async Task<IReadOnlyList<Location>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        await using var cmd = dataSource.CreateCommand(
            $"SELECT {Columns} FROM npc.locations ORDER BY created_at");
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

        var locations = new List<Location>();
        while (await reader.ReadAsync(cancellationToken))
        {
            locations.Add(Map(reader));
        }

        return locations;
    }

    public async Task<Location?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await using var cmd = dataSource.CreateCommand(
            $"SELECT {Columns} FROM npc.locations WHERE id = $1");
        cmd.Parameters.AddWithValue(id);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

        return await reader.ReadAsync(cancellationToken) ? Map(reader) : null;
    }

    public async Task<Location> AddAsync(Location location, CancellationToken cancellationToken = default)
    {
        await using var cmd = dataSource.CreateCommand(
            $"INSERT INTO npc.locations ({Columns}) VALUES ($1, $2, $3, $4)");
        AddParameters(cmd, location);
        await cmd.ExecuteNonQueryAsync(cancellationToken);

        return location;
    }

    public async Task<bool> UpdateAsync(Location location, CancellationToken cancellationToken = default)
    {
        await using var cmd = dataSource.CreateCommand(
            "UPDATE npc.locations SET name = $2, notes = $3, created_at = $4 WHERE id = $1");
        AddParameters(cmd, location);
        var rows = await cmd.ExecuteNonQueryAsync(cancellationToken);

        return rows > 0;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await using var cmd = dataSource.CreateCommand("DELETE FROM npc.locations WHERE id = $1");
        cmd.Parameters.AddWithValue(id);
        var rows = await cmd.ExecuteNonQueryAsync(cancellationToken);

        return rows > 0;
    }

    private static void AddParameters(NpgsqlCommand cmd, Location location)
    {
        cmd.Parameters.AddWithValue(location.Id);
        cmd.Parameters.AddWithValue(location.Name);
        cmd.Parameters.AddWithValue((object?)location.Notes ?? DBNull.Value);
        cmd.Parameters.AddWithValue(location.CreatedAt);
    }

    private static Location Map(NpgsqlDataReader reader) => new()
    {
        Id = reader.GetGuid(0),
        Name = reader.GetString(1),
        Notes = reader.IsDBNull(2) ? null : reader.GetString(2),
        CreatedAt = reader.GetFieldValue<DateTimeOffset>(3),
    };
}
