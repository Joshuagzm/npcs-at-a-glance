import { createFileRoute, Link } from '@tanstack/react-router'
import { MapPin, Settings, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/')({
  component: HomePage,
})

const tileClasses =
  'flex h-40 flex-col items-center justify-center gap-3 rounded-xl border bg-card p-6 text-center text-card-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none'

function DisabledTile({ children }: { children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            tileClasses,
            'cursor-not-allowed opacity-50 hover:bg-card hover:text-card-foreground',
          )}
          aria-disabled="true"
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>Under development</TooltipContent>
    </Tooltip>
  )
}

function HomePage() {
  return (
    <section className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">NPC Management</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/npcs" className={tileClasses}>
          <Users className="size-8" />
          <span className="text-lg font-semibold">NPC Management</span>
        </Link>

        <Link to="/locations" className={tileClasses}>
          <MapPin className="size-8" />
          <span className="text-lg font-semibold">Location Management</span>
        </Link>

        <DisabledTile>
          <Settings className="size-8" />
          <span className="text-lg font-semibold">Settings</span>
        </DisabledTile>
      </div>
    </section>
  )
}
