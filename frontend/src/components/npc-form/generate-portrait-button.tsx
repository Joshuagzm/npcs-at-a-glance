import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Generate/Regenerate trigger for the portrait panel. Disabled (with a tooltip
// pointing at Settings) when no Forge URL is configured. The disabled button is
// wrapped in a span so the tooltip still opens on hover.
export function GenerateButton({
  forgeConfigured,
  pending,
  hasPortrait,
  onGenerate,
}: {
  forgeConfigured: boolean
  pending: boolean
  hasPortrait: boolean
  onGenerate: () => void
}) {
  const button = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending || !forgeConfigured}
      onClick={onGenerate}
    >
      {pending ? 'Generating…' : hasPortrait ? 'Regenerate' : 'Generate portrait'}
    </Button>
  )

  if (forgeConfigured) return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{button}</span>
      </TooltipTrigger>
      <TooltipContent>
        Set an image generator URL on the Settings page to enable portraits.
      </TooltipContent>
    </Tooltip>
  )
}
