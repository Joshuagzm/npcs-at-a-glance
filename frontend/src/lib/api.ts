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
}

export interface Npc {
  id: string
  name: string
  role: string
  location: string | null
  level: number
  isHostile: boolean
  notes: string | null
  statBlock: StatBlock | null
  createdAt: string
}

export interface NpcInput {
  name: string
  role: string
  location: string | null
  level: number
  isHostile: boolean
  notes: string | null
  statBlock: StatBlock | null
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  if (!response.ok) {
    throw new Error(
      `${init?.method ?? 'GET'} ${url} failed: ${response.status} ${response.statusText}`,
    )
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
