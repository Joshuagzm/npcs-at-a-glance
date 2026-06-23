import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { withForm } from '@/components/form/app-form'
import { npcFormOptions } from './npc-form'

// Current/Max HP. Both are string fields (blank = untracked). On blur, Current
// is clipped down to Max if it overshoots — a cross-field rule, so this is a
// `withForm` panel that owns both fields rather than a single field component.
export const HitPointsField = withForm({
  ...npcFormOptions,
  render: function HitPointsFieldRender({ form }) {
    const clipToMax = () => {
      const { currentHp, maxHp } = form.state.values
      if (currentHp !== '' && maxHp !== '' && Number(currentHp) > Number(maxHp)) {
        form.setFieldValue('currentHp', maxHp)
      }
    }

    return (
      <div className="space-y-2">
        <Label>Hit points</Label>
        <div className="flex items-end gap-3">
          <form.AppField name="currentHp">
            {(field) => (
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
                  max={
                    form.state.values.maxHp === ''
                      ? 1000
                      : Number(form.state.values.maxHp)
                  }
                  className="w-20 text-center"
                  placeholder="—"
                  aria-label="Current hit points"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={() => {
                    field.handleBlur()
                    clipToMax()
                  }}
                />
              </div>
            )}
          </form.AppField>
          <span className="pb-2 text-muted-foreground">/</span>
          <form.AppField name="maxHp">
            {(field) => (
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
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={() => {
                    field.handleBlur()
                    clipToMax()
                  }}
                />
              </div>
            )}
          </form.AppField>
        </div>
      </div>
    )
  },
})
