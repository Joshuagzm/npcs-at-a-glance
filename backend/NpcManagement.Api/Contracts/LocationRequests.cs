using System.ComponentModel.DataAnnotations;

namespace NpcManagement.Api.Contracts;

public record CreateLocationRequest(
    [Required] string Name);

public record UpdateLocationRequest(
    [Required] string Name);
