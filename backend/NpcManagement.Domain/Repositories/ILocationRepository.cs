using NpcManagement.Domain.Entities;

namespace NpcManagement.Domain.Repositories;

// All operations are scoped to a single owning user, so a user only ever sees
// or affects their own locations.
public interface ILocationRepository
{
    Task<IReadOnlyList<Location>> GetAllAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<Location?> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);
    Task<Location> AddAsync(Location location, CancellationToken cancellationToken = default);
    Task<bool> UpdateAsync(Location location, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);
}
