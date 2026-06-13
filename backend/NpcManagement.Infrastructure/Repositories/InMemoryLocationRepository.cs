using System.Collections.Concurrent;
using NpcManagement.Domain.Entities;
using NpcManagement.Domain.Repositories;

namespace NpcManagement.Infrastructure.Repositories;

public class InMemoryLocationRepository : ILocationRepository
{
    private readonly ConcurrentDictionary<Guid, Location> _locations = new();

    public Task<IReadOnlyList<Location>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        IReadOnlyList<Location> locations = _locations.Values.OrderBy(l => l.CreatedAt).ToList();
        return Task.FromResult(locations);
    }

    public Task<Location?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        _locations.TryGetValue(id, out var location);
        return Task.FromResult(location);
    }

    public Task<Location> AddAsync(Location location, CancellationToken cancellationToken = default)
    {
        _locations[location.Id] = location;
        return Task.FromResult(location);
    }

    public Task<bool> UpdateAsync(Location location, CancellationToken cancellationToken = default)
    {
        if (!_locations.ContainsKey(location.Id))
        {
            return Task.FromResult(false);
        }

        _locations[location.Id] = location;
        return Task.FromResult(true);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(_locations.TryRemove(id, out _));
    }
}
