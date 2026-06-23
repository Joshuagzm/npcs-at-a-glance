import { Loader2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { withForm } from '@/components/form/app-form'
import { generatePortrait } from '@/lib/api'
import { getForgeUrl } from '@/lib/settings'
import { RACE_LABELS } from '@/lib/nameGenerator'
import { GenerateButton } from './generate-portrait-button'
import { AGE_OPTIONS, GENDER_OPTIONS, npcFormOptions } from './npc-form'

// Portrait image + the appearance fields that feed its prompt. The appearance
// inputs are plain form fields; the portrait itself lives in the form's
// `portrait`/`portraitSeed` fields, written by the generation mutation.
export const PortraitPanel = withForm({
  ...npcFormOptions,
  render: function PortraitPanelRender({ form }) {
    const portraitMutation = useMutation({
      mutationFn: () => {
        const v = form.state.values
        return generatePortrait({
          race: RACE_LABELS[v.race],
          role: v.role.trim() || null,
          name: v.name.trim() || null,
          isHostile: v.isHostile,
          gender: v.gender || null,
          age: v.age || null,
          skinColor: v.skinColor.trim() || null,
          appearanceDetails: v.appearanceDetails.trim() || null,
          seed: v.portraitSeed,
        })
      },
      onSuccess: (result) => {
        form.setFieldValue('portrait', result.image)
        form.setFieldValue('portraitSeed', result.seed)
      },
    })

    // Generation needs a Forge URL configured on the Settings page.
    const forgeConfigured = getForgeUrl().trim().length > 0

    return (
      <div className="w-72 shrink-0 space-y-4">
        <div className="space-y-2">
          <form.Subscribe
            selector={(state) => ({
              portrait: state.values.portrait,
              portraitSeed: state.values.portraitSeed,
              name: state.values.name,
            })}
          >
            {({ portrait, portraitSeed, name }) => (
              <>
                <div className="flex items-center justify-between">
                  <Label>Portrait</Label>
                  <div className="flex gap-2">
                    {portrait && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => form.setFieldValue('portrait', null)}
                      >
                        Remove
                      </Button>
                    )}
                    <GenerateButton
                      forgeConfigured={forgeConfigured}
                      pending={portraitMutation.isPending}
                      hasPortrait={Boolean(portrait)}
                      onGenerate={() => portraitMutation.mutate()}
                    />
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
              </>
            )}
          </form.Subscribe>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <form.AppField name="gender">
            {(field) => (
              <field.SelectField
                label="Gender"
                options={GENDER_OPTIONS}
                placeholder="Unspecified"
                className="w-full"
              />
            )}
          </form.AppField>
          <form.AppField name="age">
            {(field) => (
              <field.SelectField
                label="Age"
                options={AGE_OPTIONS}
                placeholder="Unspecified"
                className="w-full"
              />
            )}
          </form.AppField>
        </div>
        <form.AppField name="skinColor">
          {(field) => (
            <field.TextField
              label="Skin color"
              placeholder="Olive, pale, dark, green, …"
            />
          )}
        </form.AppField>
        <form.AppField name="appearanceDetails">
          {(field) => (
            <field.TextareaField
              label="Additional details"
              rows={3}
              placeholder="Hair, clothing, scars, expression — anything to add to the portrait prompt."
            />
          )}
        </form.AppField>
      </div>
    )
  },
})
