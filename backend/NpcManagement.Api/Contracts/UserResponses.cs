namespace NpcManagement.Api.Contracts;

public record UserResponse(
    Guid Id,
    string? Email,
    string? UserName,
    IReadOnlyList<string> Roles,
    DateTimeOffset CreatedAt);

public record AuthResponse(
    string Token,
    DateTimeOffset ExpiresAt,
    UserResponse User);
