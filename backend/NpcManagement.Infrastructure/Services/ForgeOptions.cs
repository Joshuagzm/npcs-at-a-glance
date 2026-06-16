namespace NpcManagement.Infrastructure.Services;

/// <summary>
/// Configuration for the Forge portrait generator (bound from the "Forge"
/// configuration section).
/// </summary>
public class ForgeOptions
{
    /// <summary>
    /// Checkpoint title to pin per request (e.g. "ntrMIXIllustriousXL_v40.safetensors").
    /// Empty/null means "use whatever model Forge currently has loaded".
    /// </summary>
    public string? Model { get; set; }

    /// <summary>VAE filename to pin per request (e.g. "sdxl_vae.safetensors"). Empty means leave as-is.</summary>
    public string? Vae { get; set; }
}
