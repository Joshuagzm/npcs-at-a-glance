import { Loader2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { generatePortrait } from '@/lib/api'
import { RACE_LABELS, type Race } from '@/lib/nameGenerator'

// Appearance dropdown options. The sentinel stands in for "unspecified"
// because Radix Select items can't use an empty value.
const UNSPECIFIED = '__unspecified__'
const GENDERS = ['Male', 'Female'] as const
const AGES = [
  'Child',
  'Adolescent',
  'Young adult',
  'Adult',
  'Middle-aged',
  'Elderly',
] as const

interface PortraitPanelProps {
  // Prompt context owned by the rest of the form.
  name: string
  role: string
  isHostile: boolean
  race: Race
  // Appearance fields this panel edits.
  gender: string
  onGenderChange: (value: string) => void
  age: string
  onAgeChange: (value: string) => void
  skinColor: string
  onSkinColorChange: (value: string) => void
  appearanceDetails: string
  onAppearanceDetailsChange: (value: string) => void
  // Portrait result; the seed is locked once generated so regenerations
  // stay consistent.
  portrait: string | null
  onPortraitChange: (value: string | null) => void
  portraitSeed: number | null
  onPortraitSeedChange: (value: number | null) => void
}

export function PortraitPanel({
  name,
  role,
  isHostile,
  race,
  gender,
  onGenderChange,
  age,
  onAgeChange,
  skinColor,
  onSkinColorChange,
  appearanceDetails,
  onAppearanceDetailsChange,
  portrait,
  onPortraitChange,
  portraitSeed,
  onPortraitSeedChange,
}: PortraitPanelProps) {
  const portraitMutation = useMutation({
    mutationFn: () =>
      generatePortrait({
        race: RACE_LABELS[race],
        role: role.trim() || null,
        name: name.trim() || null,
        isHostile,
        gender: gender || null,
        age: age || null,
        skinColor: skinColor.trim() || null,
        appearanceDetails: appearanceDetails.trim() || null,
        seed: portraitSeed,
      }),
    onSuccess: (result) => {
      onPortraitChange(result.image)
      onPortraitSeedChange(result.seed)
    },
  })

  return (
    <div className="w-72 shrink-0 space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Portrait</Label>
          <div className="flex gap-2">
            {portrait && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onPortraitChange(null)}
              >
                Remove
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={portraitMutation.isPending}
              onClick={() => portraitMutation.mutate()}
            >
              {portraitMutation.isPending
                ? 'Generating…'
                : portrait
                  ? 'Regenerate'
                  : 'Generate portrait'}
            </Button>
          </div>
        </div>
        {portrait ? (
          // Existing portrait stays visible during a regenerate, dimmed
          // with a spinner overlaid so it's clear work is in progress.
          <div className="relative mx-auto w-fit">
            <img
              src={`data:image/png;base64,${portrait}`}
              alt={`Portrait of ${name || 'this NPC'}`}
              className={`max-h-96 rounded-md border ${
                portraitMutation.isPending ? 'opacity-40' : ''
              }`}
            />
            {portraitMutation.isPending && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex aspect-2/3 max-h-96 w-full items-center justify-center rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
            {portraitMutation.isPending ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="size-6 animate-spin text-primary" />
                <span>
                  Generating portrait — this can take up to a couple of
                  minutes…
                </span>
              </div>
            ) : (
              'No portrait yet. Set the appearance below and generate one.'
            )}
          </div>
        )}
        {portraitMutation.isError && (
          <p className="text-sm text-destructive">
            {portraitMutation.error.message}
          </p>
        )}
        {portraitSeed !== null && (
          <p className="text-center text-xs text-muted-foreground">
            Seed {portraitSeed} · reused on regenerate
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="npc-gender">Gender</Label>
          <Select
            value={gender || UNSPECIFIED}
            onValueChange={(value) =>
              onGenderChange(value === UNSPECIFIED ? '' : value)
            }
          >
            <SelectTrigger id="npc-gender" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSPECIFIED}>Unspecified</SelectItem>
              {GENDERS.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="npc-age">Age</Label>
          <Select
            value={age || UNSPECIFIED}
            onValueChange={(value) =>
              onAgeChange(value === UNSPECIFIED ? '' : value)
            }
          >
            <SelectTrigger id="npc-age" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSPECIFIED}>Unspecified</SelectItem>
              {AGES.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="npc-skin">Skin color</Label>
        <Input
          id="npc-skin"
          value={skinColor}
          onChange={(e) => onSkinColorChange(e.target.value)}
          placeholder="Olive, pale, dark, green, …"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="npc-appearance">Additional details</Label>
        <Textarea
          id="npc-appearance"
          value={appearanceDetails}
          onChange={(e) => onAppearanceDetailsChange(e.target.value)}
          rows={3}
          placeholder="Hair, clothing, scars, expression — anything to add to the portrait prompt."
        />
      </div>
    </div>
  )
}
