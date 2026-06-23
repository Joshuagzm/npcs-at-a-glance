using NpcManagement.Infrastructure.Identity;

namespace NpcManagement.Api.Services;

public record AccessToken(string Token, DateTimeOffset ExpiresAt);

public interface ITokenService
{
    AccessToken CreateToken(AppUser user, IEnumerable<string> roles);
}
