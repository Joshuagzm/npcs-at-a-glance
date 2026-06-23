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
      errors?: Record<string, string[]>
    }
    if (problem.errors) {
      const messages = Object.values(problem.errors).flat()
      if (messages.length > 0) return messages.join(' ')
    }
    return problem.detail ?? problem.title ?? null
  } catch {
    return null
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  if (!response.ok) {
    const detail = await readErrorMessage(response)
    const prefix = `${init?.method ?? 'GET'} ${url} failed: ${response.status} ${response.statusText}`
    throw new Error(detail ? `${prefix} — ${detail}` : prefix)
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
export function generatePortrait(
  input: PortraitRequest,
): Promise<PortraitResult> {
  return request<PortraitResult>('/api/npcs/portrait', {
    method: 'POST',
    body: JSON.stringify(input),
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
