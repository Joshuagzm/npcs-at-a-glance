namespace NpcManagement.Domain.Entities;

public class Npc
{
    public Guid Id { get; set; } = Guid.NewGuid();
    // The Identity user that owns this NPC. Set from the authenticated request.
    public Guid UserId { get; set; }
    public required string Name { get; set; }
    public string? Role { get; set; }
    public Guid? LocationId { get; set; }
    public int Level { get; set; } = 1;
    public bool IsHostile { get; set; }
    public string? Notes { get; set; }
    public string? Likes { get; set; }
    public string? Dislikes { get; set; }
    public string? Goals { get; set; }
    public int? CurrentHitPoints { get; set; }
    public int? MaxHitPoints { get; set; }
    public NpcStatBlock? StatBlock { get; set; }
    // Base64-encoded PNG portrait (no data-URL prefix), generated via the
    // image-generation service. Null until one is generated.
    public string? Portrait { get; set; }
    // The seed the portrait was generated with, kept constant per NPC so
    // regenerations stay visually consistent. Null until first generated.
    public long? PortraitSeed { get; set; }
    // Appearance descriptors, persisted and fed into the portrait prompt.
    public string? Race { get; set; }
    public string? Gender { get; set; }
    public string? Age { get; set; }
    public string? SkinColor { get; set; }
    public string? AppearanceDetails { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
