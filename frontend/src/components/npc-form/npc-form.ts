import { z } from 'zod'
import { formOptions } from '@tanstack/react-form'
import type { SelectOption } from '@/components/form/fields'
import type { Npc, NpcInput, StatBlock } from '@/lib/api'
import { RACES, RACE_LABELS, type Race } from '@/lib/nameGenerator'

// The editable shape of the NPC form. Differs from `NpcInput` in ways that
// suit editing: empty strings instead of nulls, HP as strings (so the inputs
// can be blank), and likes/dislikes/goals as arrays rather than newline blobs.
export interface NpcFormValues {
  name: string
  role: string
  locationId: string
  level: number
  isHostile: boolean
  notes: string
  likes: string[]
  dislikes: string[]
  goals: string[]
  currentHp: string
  maxHp: string
  race: Race
  gender: string
  age: string
  skinColor: string
  appearanceDetails: string
  portrait: string | null
  portraitSeed: number | null
  statBlock: StatBlock | null
}

export const GENDER_OPTIONS: SelectOption[] = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
]

export const AGE_OPTIONS: SelectOption[] = [
  'Child',
  'Adolescent',
  'Young adult',
  'Adult',
  'Middle-aged',
  'Elderly',
].map((age) => ({ value: age, label: age }))

export const RACE_OPTIONS: SelectOption[] = RACES.map((race) => ({
  value: race,
  label: RACE_LABELS[race],
}))

// HP is kept as a string so the field can be empty (= "untracked"); when
// present it must be a non-negative number.
const hpField = z
  .string()
  .refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0), {
    message: 'Enter a number',
  })

export const npcFormSchema = z.object({
  name: z.string().refine((v) => v.trim().length > 0, {
    message: 'Name is required',
  }),
  role: z.string(),
  locationId: z.string(),
  level: z
    .number()
    .int()
    .min(1, { message: 'Minimum level is 1' })
    .max(20, { message: 'Maximum level is 20' }),
  isHostile: z.boolean(),
  notes: z.string(),
  likes: z.array(z.string()),
  dislikes: z.array(z.string()),
  goals: z.array(z.string()),
  currentHp: hpField,
  maxHp: hpField,
  race: z.enum(RACES),
  gender: z.string(),
  age: z.string(),
  skinColor: z.string(),
  appearanceDetails: z.string(),
  portrait: z.string().nullable(),
  portraitSeed: z.number().nullable(),
  statBlock: z.any().nullable(),
})

export const emptyNpcFormValues: NpcFormValues = {
  name: '',
  role: '',
  locationId: '',
  level: 1,
  isHostile: false,
  notes: '',
  likes: [],
  dislikes: [],
  goals: [],
  currentHp: '',
  maxHp: '',
  race: 'human',
  gender: '',
  age: '',
  skinColor: '',
  appearanceDetails: '',
  portrait: null,
  portraitSeed: null,
  statBlock: null,
}

// Shared form options. The static `defaultValues` give `withForm` panels their
// type; the dialog overrides `defaultValues` at runtime with the edited NPC.
export const npcFormOptions = formOptions({ defaultValues: emptyNpcFormValues })

export function splitList(value: string | null | undefined): string[] {
  return (value ?? '')
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function joinList(items: string[]): string | null {
  return items.length > 0 ? items.join('\n') : null
}

export function npcToFormValues(npc: Npc | null): NpcFormValues {
  if (!npc) return emptyNpcFormValues
  return {
    name: npc.name,
    role: npc.role ?? '',
    locationId: npc.locationId ?? '',
    level: npc.level,
    isHostile: npc.isHostile,
    notes: npc.notes ?? '',
    likes: splitList(npc.likes),
    dislikes: splitList(npc.dislikes),
    goals: splitList(npc.goals),
    currentHp: npc.currentHitPoints?.toString() ?? '',
    maxHp: npc.maxHitPoints?.toString() ?? '',
    race: (npc.race as Race) ?? 'human',
    gender: npc.gender ?? '',
    age: npc.age ?? '',
    skinColor: npc.skinColor ?? '',
    appearanceDetails: npc.appearanceDetails ?? '',
    portrait: npc.portrait ?? null,
    portraitSeed: npc.portraitSeed ?? null,
    statBlock: npc.statBlock ?? null,
  }
}

export function toNpcInput(values: NpcFormValues): NpcInput {
  return {
    name: values.name.trim(),
    role: values.role.trim() || null,
    locationId: values.locationId || null,
    level: values.level,
    isHostile: values.isHostile,
    notes: values.notes.trim() || null,
    likes: joinList(values.likes),
    dislikes: joinList(values.dislikes),
    goals: joinList(values.goals),
    currentHitPoints: values.currentHp === '' ? null : Number(values.currentHp),
    maxHitPoints: values.maxHp === '' ? null : Number(values.maxHp),
    statBlock: values.statBlock,
    portrait: values.portrait,
    portraitSeed: values.portraitSeed,
    race: values.race,
    gender: values.gender || null,
    age: values.age || null,
    skinColor: values.skinColor.trim() || null,
    appearanceDetails: values.appearanceDetails.trim() || null,
  }
}
