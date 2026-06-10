using NpcManagement.Domain.Entities;

namespace NpcManagement.Domain.Repositories;

public interface INpcRepository
{
    Task<IReadOnlyList<Npc>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Npc?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Npc> AddAsync(Npc npc, CancellationToken cancellationToken = default);
    Task<bool> UpdateAsync(Npc npc, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
