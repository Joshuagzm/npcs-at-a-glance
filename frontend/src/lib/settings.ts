// User settings persisted to localStorage so they survive refreshes. Currently
// just the Forge (Stable Diffusion) instance URL used for portrait generation;
// it defaults to blank, meaning "not configured".
const FORGE_URL_KEY = 'npc-management:forge-url'

export function getForgeUrl(): string {
  try {
    return localStorage.getItem(FORGE_URL_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setForgeUrl(url: string): void {
  try {
    localStorage.setItem(FORGE_URL_KEY, url)
  } catch {
    // Storage unavailable (e.g. private mode) — nothing we can do; the value
    // just won't persist this session.
  }
}
