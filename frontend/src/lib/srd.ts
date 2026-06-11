import type { StatBlock } from './api'

// D&D 5e SRD content served by the free dnd5eapi.co API (CC-BY-4.0).
const SRD_BASE = 'https://www.dnd5eapi.co/api/2014'

export interface MonsterSummary {
  index: string
  name: string
}

export async function searchMonsters(name: string): Promise<MonsterSummary[]> {
  const response = await fetch(
    `${SRD_BASE}/monsters?name=${encodeURIComponent(name)}`,
  )
  if (!response.ok) {
    throw new Error(`Monster search failed: ${response.status}`)
  }
  const data = (await response.json()) as { results: MonsterSummary[] }
  return data.results
}

interface SrdMonster {
  name: string
  size: string
  type: string
  armor_class: { value: number }[]
  hit_points: number
  speed: Record<string, string | boolean>
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  challenge_rating: number
}

export async function fetchStatBlock(index: string): Promise<StatBlock> {
  const response = await fetch(`${SRD_BASE}/monsters/${index}`)
  if (!response.ok) {
    throw new Error(`Monster lookup failed: ${response.status}`)
  }
  const monster = (await response.json()) as SrdMonster

  const speed = Object.entries(monster.speed)
    .map(([mode, value]) =>
      typeof value === 'string'
        ? mode === 'walk'
          ? value
          : `${mode} ${value}`
        : mode,
    )
    .join(', ')

  return {
    monsterName: monster.name,
    size: monster.size,
    type: monster.type,
    armorClass: monster.armor_class[0]?.value ?? 10,
    hitPoints: monster.hit_points,
    speed,
    strength: monster.strength,
    dexterity: monster.dexterity,
    constitution: monster.constitution,
    intelligence: monster.intelligence,
    wisdom: monster.wisdom,
    charisma: monster.charisma,
    challengeRating: monster.challenge_rating,
  }
}

export function formatChallengeRating(cr: number): string {
  if (cr === 0.125) return '1/8'
  if (cr === 0.25) return '1/4'
  if (cr === 0.5) return '1/2'
  return String(cr)
}
