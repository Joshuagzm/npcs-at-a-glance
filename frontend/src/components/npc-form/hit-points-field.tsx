import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface HitPointsFieldProps {
  currentHp: string
  onCurrentHpChange: (value: string) => void
  maxHp: string
  onMaxHpChange: (value: string) => void
}

export function HitPointsField({
  currentHp,
  onCurrentHpChange,
  maxHp,
  onMaxHpChange,
}: HitPointsFieldProps) {
  // Clip current HP down to max if it overshoots. Only on blur, so typing a
  // larger max doesn't momentarily drag current HP down.
  const clipToMax = () => {
    if (currentHp !== '' && maxHp !== '' && Number(currentHp) > Number(maxHp)) {
      onCurrentHpChange(maxHp)
    }
  }

  return (
    <div className="space-y-2">
      <Label>Hit points</Label>
      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <Label
            htmlFor="npc-current-hp"
            className="text-xs font-normal text-muted-foreground"
          >
            Current
          </Label>
          <Input
            id="npc-current-hp"
            type="number"
            min={0}
            max={maxHp === '' ? 1000 : Number(maxHp)}
            className="w-20 text-center"
            placeholder="—"
            aria-label="Current hit points"
            value={currentHp}
            onChange={(e) => onCurrentHpChange(e.target.value)}
            onBlur={clipToMax}
          />
        </div>
        <span className="pb-2 text-muted-foreground">/</span>
        <div className="space-y-1">
          <Label
            htmlFor="npc-max-hp"
            className="text-xs font-normal text-muted-foreground"
          >
            Max
          </Label>
          <Input
            id="npc-max-hp"
            type="number"
            min={1}
            max={1000}
            className="w-20 text-center"
            placeholder="—"
            aria-label="Maximum hit points"
            value={maxHp}
            onChange={(e) => onMaxHpChange(e.target.value)}
            onBlur={clipToMax}
          />
        </div>
      </div>
    </div>
  )
}
