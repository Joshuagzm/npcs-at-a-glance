namespace NpcManagement.Domain.Entities;

public class NpcStatBlock
{
    public required string MonsterName { get; set; }
    public required string Size { get; set; }
    public required string Type { get; set; }
    public int ArmorClass { get; set; }
    public int HitPoints { get; set; }
    public required string Speed { get; set; }
    public int Strength { get; set; }
    public int Dexterity { get; set; }
    public int Constitution { get; set; }
    public int Intelligence { get; set; }
    public int Wisdom { get; set; }
    public int Charisma { get; set; }
    public double ChallengeRating { get; set; }
    public string? FlavorText { get; set; }
    public List<StatBlockEntry> Traits { get; set; } = [];
    public List<StatBlockEntry> Actions { get; set; } = [];
}

public class StatBlockEntry
{
    public required string Name { get; set; }
    public required string Description { get; set; }
}
