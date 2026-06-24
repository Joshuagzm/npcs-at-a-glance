using System.ComponentModel.DataAnnotations;

namespace NpcManagement.Api.Contracts;

public record RegisterRequest(
    [Required, StringLength(256, MinimumLength = 3)] string UserName,
    [Required, StringLength(128, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters.")] string Password);

public record LoginRequest(
    [Required, StringLength(256, MinimumLength = 3)] string UserName,
    [Required] string Password);
