import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { BackupControls } from '@/components/backup-controls'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getForgeUrl, setForgeUrl } from '@/lib/settings'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  // `saved` is what's persisted (and used by portrait generation); `draft` is
  // the editable field. The draft is only committed to storage on Save.
  const [saved, setSaved] = useState(getForgeUrl)
  const [draft, setDraft] = useState(saved)

  const trimmedDraft = draft.trim()
  const isDirty = trimmedDraft !== saved
  const canClear = saved !== '' || draft !== ''

  const handleSave = () => {
    setForgeUrl(trimmedDraft)
    setSaved(trimmedDraft)
    setDraft(trimmedDraft)
  }

  const handleClear = () => {
    setForgeUrl('')
    setSaved('')
    setDraft('')
  }

  return (
    <section className="max-w-xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure portrait generation and manage your data.
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Image generation</h2>
        <Label htmlFor="forge-url">Image generator URL</Label>
        <div className="flex items-center gap-2">
          <Input
            id="forge-url"
            type="url"
            className="flex-1"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button type="button" onClick={handleSave} disabled={!isDirty}>
            Save
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={!canClear}
          >
            Clear
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          The address of your Stable Diffusion Forge instance (launched with{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">--api</code>),
          used to generate NPC portraits. Leave blank to disable portrait
          generation. Click Save to apply your change.
        </p>
      </div>

      <div className="space-y-2 border-t pt-6">
        <h2 className="text-lg font-medium">Data</h2>
        <BackupControls />
        <p className="text-sm text-muted-foreground">
          Export downloads a single file containing all your NPCs and locations.
          Importing a file <strong>replaces everything</strong> currently in the
          app, so keep a recent export before importing.
        </p>
      </div>
    </section>
  )
}
