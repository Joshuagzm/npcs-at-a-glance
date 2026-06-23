using System.ComponentModel.DataAnnotations;

namespace NpcManagement.Api.Contracts;

public record UpdateUserRequest(
    [Required, EmailAddress] string Email,
    [Required, StringLength(256, MinimumLength = 3)] string UserName,
    IReadOnlyList<string>? Roles = null);
