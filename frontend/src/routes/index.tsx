import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">NPC Management</h1>
      <p className="text-muted-foreground">
        Welcome! The frontend is wired up with TanStack Router, Tailwind, and
        shadcn/ui.
      </p>
    </section>
  )
}
