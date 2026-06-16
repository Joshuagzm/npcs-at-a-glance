using Microsoft.AspNetCore.Mvc;
using NpcManagement.Api.Contracts;
using NpcManagement.Domain.Entities;
using NpcManagement.Domain.Repositories;
using NpcManagement.Domain.Services;

namespace NpcManagement.Api.Controllers;

[ApiController]
[Route("api/npcs")]
public class NpcsController : ControllerBase
{
    private readonly INpcRepository _npcRepository;
    private readonly IPortraitGenerator _portraitGenerator;

    public NpcsController(
        INpcRepository npcRepository,
        IPortraitGenerator portraitGenerator)
    {
        _npcRepository = npcRepository;
        _portraitGenerator = portraitGenerator;
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
            LocationId = request.LocationId,
            Level = request.Level,
            IsHostile = request.IsHostile,
            Notes = request.Notes,
            Likes = request.Likes,
            Dislikes = request.Dislikes,
            Goals = request.Goals,
            CurrentHitPoints = request.CurrentHitPoints,
            MaxHitPoints = request.MaxHitPoints,
            StatBlock = ToStatBlock(request.StatBlock),
            Portrait = request.Portrait,
            PortraitSeed = request.PortraitSeed,
            Race = request.Race,
            Gender = request.Gender,
            Age = request.Age,
            SkinColor = request.SkinColor,
            AppearanceDetails = request.AppearanceDetails,
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
        existing.LocationId = request.LocationId;
        existing.Level = request.Level;
        existing.IsHostile = request.IsHostile;
        existing.Notes = request.Notes;
        existing.Likes = request.Likes;
        existing.Dislikes = request.Dislikes;
        existing.Goals = request.Goals;
        existing.CurrentHitPoints = request.CurrentHitPoints;
        existing.MaxHitPoints = request.MaxHitPoints;
        existing.StatBlock = ToStatBlock(request.StatBlock);
        existing.Portrait = request.Portrait;
        existing.PortraitSeed = request.PortraitSeed;
        existing.Race = request.Race;
        existing.Gender = request.Gender;
        existing.Age = request.Age;
        existing.SkinColor = request.SkinColor;
        existing.AppearanceDetails = request.AppearanceDetails;

        var updated = await _npcRepository.UpdateAsync(existing, cancellationToken);
        return updated ? Ok(existing) : NotFound();
    }

    [HttpPost("portrait")]
    public async Task<ActionResult<GeneratePortraitResponse>> GeneratePortrait(
        GeneratePortraitRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _portraitGenerator.GenerateAsync(
                new PortraitRequest(
                    request.Race, request.Role, request.Name, request.IsHostile,
                    request.Gender, request.Age, request.SkinColor,
                    request.AppearanceDetails, request.Seed),
                cancellationToken);
            return Ok(new GeneratePortraitResponse(result.Image, result.Seed));
        }
        catch (PortraitGenerationException ex)
        {
            // 502: the upstream image generator failed or is unreachable.
            return StatusCode(StatusCodes.Status502BadGateway, new { error = ex.Message });
        }
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
                Traits = ToEntries(request.Traits),
                Actions = ToEntries(request.Actions),
            };

    private static List<StatBlockEntry> ToEntries(
        List<StatBlockEntryRequest>? requests) =>
        requests?
            .Select(r => new StatBlockEntry
            {
                Name = r.Name,
                Description = r.Description,
            })
            .ToList() ?? [];

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _npcRepository.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
