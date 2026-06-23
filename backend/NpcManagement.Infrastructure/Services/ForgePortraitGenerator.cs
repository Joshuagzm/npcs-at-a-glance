using System.Net.Http.Json;
using System.Text.Json;
using NpcManagement.Domain.Services;

namespace NpcManagement.Infrastructure.Services;

/// <summary>
/// Generates NPC portraits by calling a Stable Diffusion WebUI Forge install's
/// txt2img API (<c>POST /sdapi/v1/txt2img</c>). The Forge base URL is supplied
/// per request (from the user's Settings); the timeout is configured on the
/// injected <see cref="HttpClient"/>.
/// </summary>
public class ForgePortraitGenerator(HttpClient httpClient, ForgeOptions options)
    : IPortraitGenerator
{
    // Tuned for the install's SDXL (Illustrious) checkpoint: SDXL portrait
    // bucket, Euler a / Automatic, CFG 5.5.
    private const string PromptTemplate =
        "masterpiece, best quality, highly detailed, {0}, fantasy rpg character "
        + "portrait, upper body, looking at viewer, detailed face, intricate "
        + "clothing, soft lighting, depth of field";

    private const string NegativePrompt =
        "(low quality, worst quality:1.5),(bad anatomy),lowres,bad composition,"
        + "fewer digits,text,username,logo,inaccurate eyes,extra digits,"
        + "fewer digits,extra arms,disfigured,missing arms,too many fingers,"
        + "fused fingers,missing fingers,";

    public async Task<PortraitResult> GenerateAsync(
        PortraitRequest request,
        string forgeBaseUrl,
        CancellationToken cancellationToken = default)
    {
        if (!Uri.TryCreate(forgeBaseUrl, UriKind.Absolute, out var baseUri)
            || (baseUri.Scheme != Uri.UriSchemeHttp
                && baseUri.Scheme != Uri.UriSchemeHttps))
        {
            throw new PortraitGenerationException(
                $"'{forgeBaseUrl}' is not a valid image generator URL.");
        }
        var endpoint = new Uri(baseUri, "/sdapi/v1/txt2img");

        var payload = new Dictionary<string, object?>
        {
            ["prompt"] = string.Format(PromptTemplate, BuildSubject(request)),
            ["negative_prompt"] = NegativePrompt,
            ["seed"] = request.Seed ?? -1,
            ["sampler_name"] = "Euler a",
            ["scheduler"] = "Automatic",
            ["steps"] = 28,
            ["cfg_scale"] = 5.5,
            ["width"] = 832,
            ["height"] = 1216,
            ["batch_size"] = 1,
            ["n_iter"] = 1,
            ["restore_faces"] = false,
            ["tiling"] = false,
            ["send_images"] = true,
            ["save_images"] = false,
        };

        // Optionally pin the checkpoint and/or VAE so output matches a known
        // reference. Restored afterwards so the user's global Forge state is
        // left untouched. Leave Forge:Model empty to use whatever's loaded.
        var overrides = new Dictionary<string, object?>();
        if (!string.IsNullOrWhiteSpace(options.Model))
        {
            overrides["sd_model_checkpoint"] = options.Model.Trim();
        }
        if (!string.IsNullOrWhiteSpace(options.Vae))
        {
            overrides["sd_vae"] = options.Vae.Trim();
        }
        if (overrides.Count > 0)
        {
            payload["override_settings"] = overrides;
            payload["override_settings_restore_afterwards"] = true;
        }

        HttpResponseMessage response;
        try
        {
            response = await httpClient.PostAsJsonAsync(
                endpoint, payload, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            throw new PortraitGenerationException(
                "Could not reach the image generator. Is Stable Diffusion Forge "
                + "running with the --api flag?", ex);
        }

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            var hint = response.StatusCode == System.Net.HttpStatusCode.NotFound
                ? " (the /sdapi endpoint is missing — Forge was likely started "
                  + "without --api)"
                : string.Empty;
            throw new PortraitGenerationException(
                $"Image generator returned {(int)response.StatusCode} "
                + $"{response.ReasonPhrase}{hint}. {Truncate(body, 300)}");
        }

        using var doc = JsonDocument.Parse(
            await response.Content.ReadAsStringAsync(cancellationToken));
        if (!doc.RootElement.TryGetProperty("images", out var images)
            || images.ValueKind != JsonValueKind.Array
            || images.GetArrayLength() == 0)
        {
            throw new PortraitGenerationException(
                "Image generator returned no image.");
        }

        var image = images[0].GetString()
            ?? throw new PortraitGenerationException(
                "Image generator returned an empty image.");

        return new PortraitResult(image, ExtractSeed(doc.RootElement, request.Seed));
    }

    // txt2img echoes the actual seed in the JSON-encoded "info" string. When we
    // requested a fixed seed it round-trips; when we passed -1 this is how we
    // learn the seed Forge chose so the caller can reuse it.
    private static long ExtractSeed(JsonElement root, long? requested)
    {
        try
        {
            if (root.TryGetProperty("info", out var info)
                && info.GetString() is { } infoJson)
            {
                using var infoDoc = JsonDocument.Parse(infoJson);
                if (infoDoc.RootElement.TryGetProperty("seed", out var seed)
                    && seed.TryGetInt64(out var value))
                {
                    return value;
                }
            }
        }
        catch (JsonException)
        {
            // Fall through to the requested seed below.
        }

        return requested ?? -1;
    }

    private static string BuildSubject(PortraitRequest request)
    {
        // A natural phrase, e.g. "middle-aged female elf merchant".
        var phrase = string.Join(
            " ",
            new[] { request.Age, request.Gender, request.Race, request.Role }
                .Where(part => !string.IsNullOrWhiteSpace(part))
                .Select(part => part!.Trim()));

        if (string.IsNullOrWhiteSpace(phrase))
        {
            phrase = "person";
        }

        if (request.IsHostile)
        {
            phrase = $"menacing, villainous {phrase}";
        }

        // Comma-separated extra descriptors appended to the subject.
        var extras = new List<string> { phrase };
        if (!string.IsNullOrWhiteSpace(request.SkinColor))
        {
            extras.Add($"{request.SkinColor.Trim()} skin");
        }
        if (!string.IsNullOrWhiteSpace(request.AppearanceDetails))
        {
            extras.Add(request.AppearanceDetails.Trim());
        }

        return string.Join(", ", extras);
    }

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..max];
}
