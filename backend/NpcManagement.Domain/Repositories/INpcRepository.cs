using NpcManagement.Domain.Entities;

namespace NpcManagement.Domain.Repositories;

// All operations are scoped to a single owning user, so a user only ever sees
// or affects their own NPCs.
public interface INpcRepository
{
    Task<IReadOnlyList<Npc>> GetAllAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<Npc?> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);
    Task<Npc> AddAsync(Npc npc, CancellationToken cancellationToken = default);
    Task<bool> UpdateAsync(Npc npc, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);
}
