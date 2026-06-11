namespace NpcManagement.Domain.Entities;

public class Npc
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Name { get; set; }
    public required string Role { get; set; }
    public string? Location { get; set; }
    public int Level { get; set; } = 1;
    public bool IsHostile { get; set; }
    public string? Notes { get; set; }
    public NpcStatBlock? StatBlock { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
