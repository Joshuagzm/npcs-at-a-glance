using System.ComponentModel.DataAnnotations;

namespace NpcManagement.Api.Contracts;

public record StatBlockEntryRequest(
    [Required] string Name,
    [Required] string Description);

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
    [Range(0, 30)] double ChallengeRating,
    string? FlavorText = null,
    List<StatBlockEntryRequest>? Traits = null,
    List<StatBlockEntryRequest>? Actions = null);

public record CreateNpcRequest(
    [Required] string Name,
    string? Role = null,
    Guid? LocationId = null,
    [Range(1, 100)] int Level = 1,
    bool IsHostile = false,
    string? Notes = null,
    string? Likes = null,
    string? Dislikes = null,
    string? Goals = null,
    [Range(0, 1000)] int? CurrentHitPoints = null,
    [Range(1, 1000)] int? MaxHitPoints = null,
    StatBlockRequest? StatBlock = null,
    string? Portrait = null,
    long? PortraitSeed = null,
    string? Race = null,
    string? Gender = null,
    string? Age = null,
    string? SkinColor = null,
    string? AppearanceDetails = null);

public record UpdateNpcRequest(
    [Required] string Name,
    string? Role,
    Guid? LocationId,
    [Range(1, 100)] int Level,
    bool IsHostile,
    string? Notes,
    string? Likes,
    string? Dislikes,
    string? Goals,
    [Range(0, 1000)] int? CurrentHitPoints,
    [Range(1, 1000)] int? MaxHitPoints,
    StatBlockRequest? StatBlock,
    string? Portrait,
    long? PortraitSeed,
    string? Race,
    string? Gender,
    string? Age,
    string? SkinColor,
    string? AppearanceDetails);

public record GeneratePortraitRequest(
    string? Race = null,
    string? Role = null,
    string? Name = null,
    bool IsHostile = false,
    string? Gender = null,
    string? Age = null,
    string? SkinColor = null,
    string? AppearanceDetails = null,
    long? Seed = null,
    // Base URL of the user's Forge instance, from the Settings page. Required
    // for generation; the endpoint rejects the request when it's missing.
    string? ForgeUrl = null);

public record GeneratePortraitResponse(string Image, long Seed);
