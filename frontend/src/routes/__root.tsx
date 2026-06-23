import { useEffect } from 'react'
import {
  Link,
  Outlet,
  createRootRoute,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { ModeToggle } from '@/components/mode-toggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const onLoginPage = pathname === '/login'

  // Gate everything behind authentication: send signed-out visitors to /login.
  useEffect(() => {
    if (!isAuthenticated && !onLoginPage) {
      navigate({ to: '/login' })
    }
  }, [isAuthenticated, onLoginPage, navigate])

  // The login page renders on its own, without the app chrome.
  if (onLoginPage) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b">
          <nav className="mx-auto flex max-w-5xl items-center px-6 py-4">
            <span className="font-semibold">NPC Management</span>
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

  // Redirecting unauthenticated visitors; render nothing in the meantime.
  if (!isAuthenticated) {
    return null
  }

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
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {user?.userName ?? user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              Sign out
            </Button>
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
