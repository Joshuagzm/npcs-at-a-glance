import { getForgeUrl } from './settings'
import { clearAuth, getToken, type AuthUser } from './auth'

export interface StatBlockEntry {
  name: string
  description: string
}

export interface StatBlock {
  monsterName: string
  size: string
  type: string
  armorClass: number
  hitPoints: number
  speed: string
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  challengeRating: number
  flavorText: string | null
  traits: StatBlockEntry[]
  actions: StatBlockEntry[]
}

export interface Location {
  id: string
  userId: string
  name: string
  notes: string | null
  createdAt: string
}

export interface LocationInput {
  name: string
  notes: string | null
}

export interface Npc {
  id: string
  userId: string
  name: string
  role: string | null
  locationId: string | null
  level: number
  isHostile: boolean
  notes: string | null
  likes: string | null
  dislikes: string | null
  goals: string | null
  currentHitPoints: number | null
  maxHitPoints: number | null
  statBlock: StatBlock | null
  portrait: string | null
  portraitSeed: number | null
  race: string | null
  gender: string | null
  age: string | null
  skinColor: string | null
  appearanceDetails: string | null
  createdAt: string
}

export interface NpcInput {
  name: string
  role: string | null
  locationId: string | null
  level: number
  isHostile: boolean
  notes: string | null
  likes: string | null
  dislikes: string | null
  goals: string | null
  currentHitPoints: number | null
  maxHitPoints: number | null
  statBlock: StatBlock | null
  portrait: string | null
  portraitSeed: number | null
  race: string | null
  gender: string | null
  age: string | null
  skinColor: string | null
  appearanceDetails: string | null
}

export interface PortraitRequest {
  race: string | null
  role: string | null
  name: string | null
  isHostile: boolean
  gender: string | null
  age: string | null
  skinColor: string | null
  appearanceDetails: string | null
  seed: number | null
}

export interface PortraitResult {
  image: string
  seed: number
}

// ASP.NET Core returns ProblemDetails on errors — a validation failure
// carries an `errors` map, other failures a `detail`/`title`. Pull the most
// specific human-readable message out, falling back to plain text, so the UI
// shows why a request failed instead of a bare status code.
async function readErrorMessage(response: Response): Promise<string | null> {
  try {
    const text = await response.text()
    if (!text) return null

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('json')) return text

    const problem = JSON.parse(text) as {
      detail?: string
      title?: string
      error?: string
      errors?: Record<string, string[]>
    }
    if (problem.errors) {
      const messages = Object.values(problem.errors).flat()
      if (messages.length > 0) return messages.join(' ')
    }
    return problem.detail ?? problem.error ?? problem.title ?? null
  } catch {
    return null
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })

  // A 401 means the session is gone or expired — drop it so the app gates the
  // user back to the login screen.
  if (response.status === 401) {
    clearAuth()
  }

  if (!response.ok) {
    // Surface the server's human-readable message on its own — no method/URL or
    // status code — so the UI can show it directly (e.g. validation messages).
    const detail = await readErrorMessage(response)
    throw new Error(detail || response.statusText || 'Request failed.')
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export function listNpcs(): Promise<Npc[]> {
  return request<Npc[]>('/api/npcs')
}

export function createNpc(input: NpcInput): Promise<Npc> {
  return request<Npc>('/api/npcs', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateNpc(id: string, input: NpcInput): Promise<Npc> {
  return request<Npc>(`/api/npcs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteNpc(id: string): Promise<void> {
  return request<void>(`/api/npcs/${id}`, { method: 'DELETE' })
}

// Returns a base64-encoded PNG (no data-URL prefix) and the seed it used.
// The user-configured Forge URL is attached here; the backend rejects the
// request when it's blank.
export function generatePortrait(
  input: PortraitRequest,
): Promise<PortraitResult> {
  return request<PortraitResult>('/api/npcs/portrait', {
    method: 'POST',
    body: JSON.stringify({ ...input, forgeUrl: getForgeUrl().trim() || null }),
  })
}

export function listLocations(): Promise<Location[]> {
  return request<Location[]>('/api/locations')
}

export function createLocation(input: LocationInput): Promise<Location> {
  return request<Location>('/api/locations', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateLocation(
  id: string,
  input: LocationInput,
): Promise<Location> {
  return request<Location>(`/api/locations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteLocation(id: string): Promise<void> {
  return request<void>(`/api/locations/${id}`, { method: 'DELETE' })
}

export interface AuthResponse {
  token: string
  expiresAt: string
  user: AuthUser
}

export function login(userName: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ userName, password }),
  })
}

export function register(
  userName: string,
  password: string,
): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ userName, password }),
  })
}
