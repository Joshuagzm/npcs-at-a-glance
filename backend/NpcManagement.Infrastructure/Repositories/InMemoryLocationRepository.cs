using System.Collections.Concurrent;
using NpcManagement.Domain.Entities;
using NpcManagement.Domain.Repositories;

namespace NpcManagement.Infrastructure.Repositories;

public class InMemoryLocationRepository : ILocationRepository
{
    private readonly ConcurrentDictionary<Guid, Location> _locations = new();

    public Task<IReadOnlyList<Location>> GetAllAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        IReadOnlyList<Location> locations = _locations.Values
            .Where(l => l.UserId == userId)
            .OrderBy(l => l.CreatedAt)
            .ToList();
        return Task.FromResult(locations);
    }

    public Task<Location?> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        var location = _locations.TryGetValue(id, out var found) && found.UserId == userId ? found : null;
        return Task.FromResult(location);
    }

    public Task<Location> AddAsync(Location location, CancellationToken cancellationToken = default)
    {
        _locations[location.Id] = location;
        return Task.FromResult(location);
    }

    public Task<bool> UpdateAsync(Location location, CancellationToken cancellationToken = default)
    {
        if (!_locations.TryGetValue(location.Id, out var existing) || existing.UserId != location.UserId)
        {
            return Task.FromResult(false);
        }

        _locations[location.Id] = location;
        return Task.FromResult(true);
    }

    public Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        if (!_locations.TryGetValue(id, out var existing) || existing.UserId != userId)
        {
            return Task.FromResult(false);
        }

        return Task.FromResult(_locations.TryRemove(id, out _));
    }
}
