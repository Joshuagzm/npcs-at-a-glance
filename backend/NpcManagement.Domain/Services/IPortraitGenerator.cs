namespace NpcManagement.Domain.Services;

/// <summary>
/// Describes the NPC traits used to compose a portrait generation prompt.
/// </summary>
public record PortraitRequest(
    string? Race,
    string? Role,
    string? Name,
    bool IsHostile);

/// <summary>
/// Generates a character portrait for an NPC. Implementations call out to an
/// image-generation backend and return the image as a base64-encoded PNG.
/// </summary>
public interface IPortraitGenerator
{
    Task<string> GenerateAsync(PortraitRequest request, CancellationToken cancellationToken = default);
}

/// <summary>Thrown when portrait generation fails for a reason worth showing the caller.</summary>
public class PortraitGenerationException : Exception
{
    public PortraitGenerationException(string message) : base(message) { }

    public PortraitGenerationException(string message, Exception inner)
        : base(message, inner) { }
}
