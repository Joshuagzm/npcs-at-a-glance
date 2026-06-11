using Microsoft.AspNetCore.Mvc;
using NpcManagement.Api.Contracts;
using NpcManagement.Domain.Entities;
using NpcManagement.Domain.Repositories;

namespace NpcManagement.Api.Controllers;

[ApiController]
[Route("api/npcs")]
public class NpcsController : ControllerBase
{
    private readonly INpcRepository _npcRepository;

    public NpcsController(INpcRepository npcRepository)
    {
        _npcRepository = npcRepository;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<Npc>>> GetAll(CancellationToken cancellationToken)
    {
        var npcs = await _npcRepository.GetAllAsync(cancellationToken);
        return Ok(npcs);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Npc>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var npc = await _npcRepository.GetByIdAsync(id, cancellationToken);
        return npc is null ? NotFound() : Ok(npc);
    }

    [HttpPost]
    public async Task<ActionResult<Npc>> Create(CreateNpcRequest request, CancellationToken cancellationToken)
    {
        var npc = new Npc
        {
            Name = request.Name,
            Role = request.Role,
            Location = request.Location,
            Level = request.Level,
            IsHostile = request.IsHostile,
            Notes = request.Notes,
            StatBlock = ToStatBlock(request.StatBlock),
        };

        var created = await _npcRepository.AddAsync(npc, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<Npc>> Update(Guid id, UpdateNpcRequest request, CancellationToken cancellationToken)
    {
        var existing = await _npcRepository.GetByIdAsync(id, cancellationToken);
        if (existing is null)
        {
            return NotFound();
        }

        existing.Name = request.Name;
        existing.Role = request.Role;
        existing.Location = request.Location;
        existing.Level = request.Level;
        existing.IsHostile = request.IsHostile;
        existing.Notes = request.Notes;
        existing.StatBlock = ToStatBlock(request.StatBlock);

        var updated = await _npcRepository.UpdateAsync(existing, cancellationToken);
        return updated ? Ok(existing) : NotFound();
    }

    private static NpcStatBlock? ToStatBlock(StatBlockRequest? request) =>
        request is null
            ? null
            : new NpcStatBlock
            {
                MonsterName = request.MonsterName,
                Size = request.Size,
                Type = request.Type,
                ArmorClass = request.ArmorClass,
                HitPoints = request.HitPoints,
                Speed = request.Speed,
                Strength = request.Strength,
                Dexterity = request.Dexterity,
                Constitution = request.Constitution,
                Intelligence = request.Intelligence,
                Wisdom = request.Wisdom,
                Charisma = request.Charisma,
                ChallengeRating = request.ChallengeRating,
                FlavorText = request.FlavorText,
            };

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _npcRepository.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
