using System.ComponentModel.DataAnnotations;

namespace NpcManagement.Api.Contracts;

public record CreateLocationRequest(
    [Required] string Name,
    string? Notes = null);

public record UpdateLocationRequest(
    [Required] string Name,
    string? Notes = null);
