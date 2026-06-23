import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getForgeUrl, setForgeUrl } from '@/lib/settings'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  // Seed from localStorage; persist on every change so it survives refreshes.
  const [forgeUrl, setForgeUrlState] = useState(getForgeUrl)

  const handleChange = (value: string) => {
    setForgeUrlState(value)
    setForgeUrl(value)
  }

  return (
    <section className="max-w-xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure how NPC portraits are generated.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="forge-url">Image generator URL</Label>
        <Input
          id="forge-url"
          type="url"
          placeholder="http://127.0.0.1:7860"
          value={forgeUrl}
          onChange={(e) => handleChange(e.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          The address of your Stable Diffusion Forge instance (launched with{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">--api</code>),
          used to generate NPC portraits. Leave blank to disable portrait
          generation. Saved automatically in this browser.
        </p>
      </div>
    </section>
  )
}
