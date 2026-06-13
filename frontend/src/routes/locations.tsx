import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  createLocation,
  deleteLocation,
  listLocations,
  listNpcs,
  updateLocation,
  type Location,
  type LocationInput,
  type Npc,
} from '@/lib/api'

export const Route = createFileRoute('/locations')({
  component: LocationsPage,
})

function LocationsPage() {
  const queryClient = useQueryClient()
  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: listLocations,
  })
  const npcsQuery = useQuery({ queryKey: ['npcs'], queryFn: listNpcs })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['locations'] })

  const closeDialog = () => {
    setDialogOpen(false)
    setEditing(null)
  }

  const openEdit = (location: Location) => {
    setEditing(location)
    setDialogOpen(true)
  }

  const createMutation = useMutation({
    mutationFn: createLocation,
    onSuccess: () => {
      invalidate()
      closeDialog()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: LocationInput }) =>
      updateLocation(id, input),
    onSuccess: () => {
      invalidate()
      closeDialog()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteLocation,
    onSuccess: invalidate,
  })

  const handleSubmit = (input: LocationInput) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, input })
    } else {
      createMutation.mutate(input)
    }
  }

  const locations = locationsQuery.data ?? []
  const npcs = npcsQuery.data ?? []
  const npcsFor = (locationId: string) =>
    npcs.filter((npc) => npc.locationId === locationId)

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground">Places your NPCs inhabit.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
        >
          Add location
        </Button>
      </div>

      {locationsQuery.isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : locations.length === 0 ? (
        <p className="text-muted-foreground">
          No locations yet — add your first one.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>NPCs</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((location) => (
              <TableRow
                key={location.id}
                className="cursor-pointer"
                onClick={() => openEdit(location)}
              >
                <TableCell className="font-medium">{location.name}</TableCell>
                <TableCell>{npcsFor(location.id).length}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(location)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (confirm(`Delete ${location.name}?`)) {
                          deleteMutation.mutate(location.id)
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <LocationFormDialog
        key={dialogOpen ? (editing?.id ?? 'create') : 'closed'}
        open={dialogOpen}
        location={editing}
        associatedNpcs={editing ? npcsFor(editing.id) : []}
        onClose={closeDialog}
        onSubmit={handleSubmit}
        pending={createMutation.isPending || updateMutation.isPending}
        error={editing ? updateMutation.error : createMutation.error}
      />
    </section>
  )
}

interface LocationFormDialogProps {
  open: boolean
  location: Location | null
  associatedNpcs: Npc[]
  onClose: () => void
  onSubmit: (input: LocationInput) => void
  pending: boolean
  error: Error | null
}

function LocationFormDialog({
  open,
  location,
  associatedNpcs,
  onClose,
  onSubmit,
  pending,
  error,
}: LocationFormDialogProps) {
  const [name, setName] = useState(location?.name ?? '')

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim() })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {location ? `Edit ${location.name}` : 'Add location'}
          </DialogTitle>
          <DialogDescription>
            {location
              ? 'Update the location and see who lives here.'
              : 'Name the new location.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location-name">Name</Label>
            <Input
              id="location-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          {location && (
            <div className="space-y-2">
              <Label>NPCs in this location</Label>
              {associatedNpcs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No NPCs are assigned to this location yet.
                </p>
              ) : (
                <ul className="space-y-1">
                  {associatedNpcs.map((npc) => (
                    <li
                      key={npc.id}
                      className="rounded-md border bg-muted/40 px-3 py-1.5 text-sm"
                    >
                      {npc.name}
                      {npc.role && (
                        <span className="text-muted-foreground">
                          {' '}
                          — {npc.role}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error.message}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending
                ? 'Saving…'
                : location
                  ? 'Save changes'
                  : 'Create location'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
