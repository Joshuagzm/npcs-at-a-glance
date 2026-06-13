using NpcManagement.Domain.Entities;

namespace NpcManagement.Domain.Repositories;

public interface ILocationRepository
{
    Task<IReadOnlyList<Location>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Location?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Location> AddAsync(Location location, CancellationToken cancellationToken = default);
    Task<bool> UpdateAsync(Location location, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
