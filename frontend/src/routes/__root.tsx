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
          <span className="font-semibold">NPC Management</span>
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground [&.active]:text-foreground"
          >
            Home
          </Link>
          <Link
            to="/npcs"
            className="text-sm text-muted-foreground hover:text-foreground [&.active]:text-foreground"
          >
            NPCs
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
