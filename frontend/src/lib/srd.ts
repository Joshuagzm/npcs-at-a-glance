import type { StatBlock } from './api'

// D&D 5e SRD content served by the free dnd5eapi.co API (CC-BY-4.0).
const SRD_BASE = 'https://www.dnd5eapi.co/api/2014'

// Optional local dataset extracted from a personal Monster Manual copy
// (see scripts/parse_mm_statblocks.py). Gitignored; when absent the
// picker falls back to the SRD API.
const LOCAL_DATASET_URL = '/monster-manual.json'

export interface MonsterSummary {
  index: string
  name: string
}

interface LocalMonster {
  name: string
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

let localMonstersPromise: Promise<Map<string, StatBlock> | null> | null = null

function loadLocalMonsters(): Promise<Map<string, StatBlock> | null> {
  localMonstersPromise ??= fetch(LOCAL_DATASET_URL)
    .then(async (response) => {
      if (!response.ok) return null
      const monsters = (await response.json()) as LocalMonster[]
      return new Map(
        monsters.map((m) => [
          m.name.toLowerCase(),
          {
            monsterName: m.name,
            size: m.size,
            type: m.type,
            armorClass: m.armorClass,
            hitPoints: m.hitPoints,
            speed: m.speed,
            strength: m.strength,
            dexterity: m.dexterity,
            constitution: m.constitution,
            intelligence: m.intelligence,
            wisdom: m.wisdom,
            charisma: m.charisma,
            challengeRating: m.challengeRating,
            flavorText: m.flavorText,
          },
        ]),
      )
    })
    .catch(() => null)
  return localMonstersPromise
}

const LOCAL_PREFIX = 'local:'

export async function searchMonsters(name: string): Promise<MonsterSummary[]> {
  const local = await loadLocalMonsters()
  if (local) {
    const query = name.toLowerCase()
    return [...local.values()]
      .filter((m) => m.monsterName.toLowerCase().includes(query))
      .map((m) => ({
        index: `${LOCAL_PREFIX}${m.monsterName.toLowerCase()}`,
        name: m.monsterName,
      }))
  }

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
  desc?: string
}

export async function fetchStatBlock(index: string): Promise<StatBlock> {
  if (index.startsWith(LOCAL_PREFIX)) {
    const local = await loadLocalMonsters()
    const block = local?.get(index.slice(LOCAL_PREFIX.length))
    if (!block) {
      throw new Error(`Monster not found in local dataset: ${index}`)
    }
    return block
  }

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
    flavorText: monster.desc ?? null,
  }
}

export function formatChallengeRating(cr: number): string {
  if (cr === 0.125) return '1/8'
  if (cr === 0.25) return '1/4'
  if (cr === 0.5) return '1/2'
  return String(cr)
}
