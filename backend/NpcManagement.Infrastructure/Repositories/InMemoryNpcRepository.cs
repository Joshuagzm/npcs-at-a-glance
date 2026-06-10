using System.Collections.Concurrent;
using NpcManagement.Domain.Entities;
using NpcManagement.Domain.Repositories;

namespace NpcManagement.Infrastructure.Repositories;

public class InMemoryNpcRepository : INpcRepository
{
    private readonly ConcurrentDictionary<Guid, Npc> _npcs = new();

    public Task<IReadOnlyList<Npc>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        IReadOnlyList<Npc> npcs = _npcs.Values.OrderBy(n => n.CreatedAt).ToList();
        return Task.FromResult(npcs);
    }

    public Task<Npc?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        _npcs.TryGetValue(id, out var npc);
        return Task.FromResult(npc);
    }

    public Task<Npc> AddAsync(Npc npc, CancellationToken cancellationToken = default)
    {
        _npcs[npc.Id] = npc;
        return Task.FromResult(npc);
    }

    public Task<bool> UpdateAsync(Npc npc, CancellationToken cancellationToken = default)
    {
        if (!_npcs.ContainsKey(npc.Id))
        {
            return Task.FromResult(false);
        }

        _npcs[npc.Id] = npc;
        return Task.FromResult(true);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(_npcs.TryRemove(id, out _));
    }
}
