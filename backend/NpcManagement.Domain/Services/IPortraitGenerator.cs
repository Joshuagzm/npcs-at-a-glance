namespace NpcManagement.Domain.Services;

/// <summary>
/// Describes the NPC traits used to compose a portrait generation prompt.
/// </summary>
public record PortraitRequest(
    string? Race,
    string? Role,
    string? Name,
    bool IsHostile,
    string? Gender = null,
    string? Age = null,
    string? SkinColor = null,
    string? AppearanceDetails = null,
    // The seed to generate with. Null lets the backend pick one (random);
    // the chosen seed is reported back so it can be reused for consistency.
    long? Seed = null);

/// <summary>The generated portrait (base64 PNG) and the seed it was produced with.</summary>
public record PortraitResult(string Image, long Seed);

/// <summary>
/// Generates a character portrait for an NPC. Implementations call out to an
/// image-generation backend and return the image as a base64-encoded PNG.
/// </summary>
public interface IPortraitGenerator
{
    /// <param name="forgeBaseUrl">
    /// Absolute base URL of the Stable Diffusion Forge instance to call
    /// (configured by the user on the Settings page).
    /// </param>
    Task<PortraitResult> GenerateAsync(
        PortraitRequest request,
        string forgeBaseUrl,
        CancellationToken cancellationToken = default);
}

/// <summary>Thrown when portrait generation fails for a reason worth showing the caller.</summary>
public class PortraitGenerationException : Exception
{
    public PortraitGenerationException(string message) : base(message) { }

    public PortraitGenerationException(string message, Exception inner)
        : base(message, inner) { }
}
