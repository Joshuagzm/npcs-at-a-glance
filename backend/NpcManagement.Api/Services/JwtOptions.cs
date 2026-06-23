namespace NpcManagement.Api.Services;

// Bound from the "Jwt" configuration section. The signing key must be supplied
// via configuration (appsettings / user-secrets / env) — there is no default.
public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public int ExpiryMinutes { get; set; } = 60;
}
