namespace NpcManagement.Domain.Entities;

public class Location
{
    public Guid Id { get; set; } = Guid.NewGuid();
    // The Identity user that owns this location. Set from the authenticated request.
    public Guid UserId { get; set; }
    public required string Name { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
