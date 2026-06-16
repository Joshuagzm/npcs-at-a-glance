using System.Net.Http.Json;
using System.Text.Json;
using NpcManagement.Domain.Services;

namespace NpcManagement.Infrastructure.Services;

/// <summary>
/// Generates NPC portraits by calling a local Stable Diffusion WebUI Forge
/// install's txt2img API (<c>POST /sdapi/v1/txt2img</c>). The base address and
/// timeout are configured on the injected <see cref="HttpClient"/>.
/// </summary>
public class ForgePortraitGenerator(HttpClient httpClient) : IPortraitGenerator
{
    // Tuned for the install's SDXL (Illustrious) checkpoint: SDXL portrait
    // bucket, DPM++ 2M / Karras, modest CFG. See the txt2img recipe in the
    // Forge agent's notes.
    private const string PromptTemplate =
        "masterpiece, best quality, highly detailed, {0}, fantasy rpg character "
        + "portrait, upper body, looking at viewer, detailed face, intricate "
        + "clothing, soft lighting, depth of field";

    private const string NegativePrompt =
        "lowres, worst quality, low quality, bad anatomy, bad hands, missing "
        + "fingers, extra fingers, extra limbs, deformed, mutated, disfigured, "
        + "blurry, jpeg artifacts, text, watermark, signature, username, "
        + "cropped, out of frame, nsfw, nude";

    public async Task<string> GenerateAsync(
        PortraitRequest request,
        CancellationToken cancellationToken = default)
    {
        var payload = new
        {
            prompt = string.Format(PromptTemplate, BuildSubject(request)),
            negative_prompt = NegativePrompt,
            seed = -1,
            sampler_name = "DPM++ 2M",
            scheduler = "Karras",
            steps = 28,
            cfg_scale = 6,
            width = 832,
            height = 1216,
            batch_size = 1,
            n_iter = 1,
            restore_faces = false,
            tiling = false,
            send_images = true,
            save_images = false,
        };

        HttpResponseMessage response;
        try
        {
            response = await httpClient.PostAsJsonAsync(
                "/sdapi/v1/txt2img", payload, cancellationToken);
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

        return images[0].GetString()
            ?? throw new PortraitGenerationException(
                "Image generator returned an empty image.");
    }

    private static string BuildSubject(PortraitRequest request)
    {
        var descriptors = new[] { request.Race, request.Role }
            .Where(part => !string.IsNullOrWhiteSpace(part))
            .Select(part => part!.Trim());

        var subject = string.Join(", ", descriptors);
        if (string.IsNullOrWhiteSpace(subject))
        {
            subject = "person";
        }

        return request.IsHostile ? $"menacing, villainous {subject}" : subject;
    }

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..max];
}
