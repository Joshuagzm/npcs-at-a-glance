using System.ComponentModel.DataAnnotations;

namespace NpcManagement.Api.Contracts;

public record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, StringLength(256, MinimumLength = 3)] string UserName,
    [Required, StringLength(128, MinimumLength = 6)] string Password);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);
