using System.ComponentModel.DataAnnotations;

namespace NpcManagement.Api.Contracts;

public record StatBlockRequest(
    [Required] string MonsterName,
    [Required] string Size,
    [Required] string Type,
    [Range(0, 30)] int ArmorClass,
    [Range(1, 1000)] int HitPoints,
    [Required] string Speed,
    [Range(1, 30)] int Strength,
    [Range(1, 30)] int Dexterity,
    [Range(1, 30)] int Constitution,
    [Range(1, 30)] int Intelligence,
    [Range(1, 30)] int Wisdom,
    [Range(1, 30)] int Charisma,
    [Range(0, 30)] double ChallengeRating);

public record CreateNpcRequest(
    [Required] string Name,
    [Required] string Role,
    string? Location,
    [Range(1, 100)] int Level = 1,
    bool IsHostile = false,
    string? Notes = null,
    StatBlockRequest? StatBlock = null);

public record UpdateNpcRequest(
    [Required] string Name,
    [Required] string Role,
    string? Location,
    [Range(1, 100)] int Level,
    bool IsHostile,
    string? Notes,
    StatBlockRequest? StatBlock);
