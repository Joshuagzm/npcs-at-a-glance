using System.ComponentModel.DataAnnotations;

namespace NpcManagement.Api.Contracts;

public record CreateNpcRequest(
    [Required] string Name,
    [Required] string Role,
    string? Location,
    [Range(1, 100)] int Level = 1,
    bool IsHostile = false,
    string? Notes = null);

public record UpdateNpcRequest(
    [Required] string Name,
    [Required] string Role,
    string? Location,
    [Range(1, 100)] int Level,
    bool IsHostile,
    string? Notes);
