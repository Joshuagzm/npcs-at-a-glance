import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { ModeToggle } from '@/components/mode-toggle'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
          <Link
            to="/"
            className="font-semibold transition-colors hover:text-muted-foreground"
          >
            NPC Management
          </Link>
          <Link
            to="/npcs"
            className="text-sm text-muted-foreground hover:text-foreground [&.active]:text-foreground"
          >
            NPCs
          </Link>
          <Link
            to="/locations"
            className="text-sm text-muted-foreground hover:text-foreground [&.active]:text-foreground"
          >
            Locations
          </Link>
          <Link
            to="/settings"
            className="text-sm text-muted-foreground hover:text-foreground [&.active]:text-foreground"
          >
            Settings
          </Link>
          <div className="ml-auto">
            <ModeToggle />
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
