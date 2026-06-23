using System.Collections.Concurrent;
using NpcManagement.Domain.Entities;
using NpcManagement.Domain.Repositories;

namespace NpcManagement.Infrastructure.Repositories;

public class InMemoryNpcRepository : INpcRepository
{
    private readonly ConcurrentDictionary<Guid, Npc> _npcs = new();

    public Task<IReadOnlyList<Npc>> GetAllAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        IReadOnlyList<Npc> npcs = _npcs.Values
            .Where(n => n.UserId == userId)
            .OrderBy(n => n.CreatedAt)
            .ToList();
        return Task.FromResult(npcs);
    }

    public Task<Npc?> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        var npc = _npcs.TryGetValue(id, out var found) && found.UserId == userId ? found : null;
        return Task.FromResult(npc);
    }

    public Task<Npc> AddAsync(Npc npc, CancellationToken cancellationToken = default)
    {
        _npcs[npc.Id] = npc;
        return Task.FromResult(npc);
    }

    public Task<bool> UpdateAsync(Npc npc, CancellationToken cancellationToken = default)
    {
        if (!_npcs.TryGetValue(npc.Id, out var existing) || existing.UserId != npc.UserId)
        {
            return Task.FromResult(false);
        }

        _npcs[npc.Id] = npc;
        return Task.FromResult(true);
    }

    public Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        if (!_npcs.TryGetValue(id, out var existing) || existing.UserId != userId)
        {
            return Task.FromResult(false);
        }

        return Task.FromResult(_npcs.TryRemove(id, out _));
    }
}
