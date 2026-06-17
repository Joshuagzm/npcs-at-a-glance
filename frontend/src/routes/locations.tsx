import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { BackupControls } from '@/components/backup-controls'
import { Badge } from '@/components/ui/badge'
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
import { Textarea } from '@/components/ui/textarea'
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
import { formatChallengeRating } from '@/lib/srd'
import { cn } from '@/lib/utils'

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
        <div className="flex items-center gap-2">
          <BackupControls />
          <Button
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            Add location
          </Button>
        </div>
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
              <TableHead>Notes</TableHead>
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
                <TableCell className="max-w-xs truncate text-muted-foreground">
                  {location.notes || '—'}
                </TableCell>
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
  const [notes, setNotes] = useState(location?.notes ?? '')
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null)
  // Derive from the live list so the panel closes if the NPC disappears.
  const selectedNpc =
    associatedNpcs.find((npc) => npc.id === selectedNpcId) ?? null

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), notes: notes.trim() || null })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className={cn(selectedNpc && 'sm:max-w-3xl')}>
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

        <div className="flex gap-4">
          <form
            id="location-form"
            onSubmit={handleSubmit}
            className={cn('space-y-4', selectedNpc ? 'w-1/2' : 'w-full')}
          >
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

            <div className="space-y-2">
              <Label htmlFor="location-notes">Location notes</Label>
              <Textarea
                id="location-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="A bustling port city, ruled by masked lords…"
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
                      <li key={npc.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedNpcId(npc.id)}
                          className={cn(
                            'w-full rounded-md border bg-muted/40 px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted',
                            selectedNpcId === npc.id &&
                              'border-ring bg-muted ring-2 ring-ring/40',
                          )}
                        >
                          {npc.name}
                          {npc.role && (
                            <span className="text-muted-foreground">
                              {' '}
                              — {npc.role}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error.message}</p>
            )}
          </form>

          {selectedNpc && (
            <div className="max-h-[60vh] w-1/2 overflow-y-auto border-l pl-4">
              <NpcDetailPanel
                npc={selectedNpc}
                onClose={() => setSelectedNpcId(null)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="location-form"
            disabled={pending || !name.trim()}
          >
            {pending
              ? 'Saving…'
              : location
                ? 'Save changes'
                : 'Create location'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NpcDetailPanel({ npc, onClose }: { npc: Npc; onClose: () => void }) {
  const hasHp = npc.currentHitPoints != null || npc.maxHitPoints != null

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-heading text-base font-medium">{npc.name}</h3>
          {npc.role && (
            <p className="text-sm text-muted-foreground">{npc.role}</p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close NPC details"
        >
          <X />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={npc.isHostile ? 'destructive' : 'secondary'}>
          {npc.isHostile ? 'Hostile' : 'Friendly'}
        </Badge>
        <span className="text-muted-foreground">Level {npc.level}</span>
        {hasHp && (
          <span className="text-muted-foreground">
            HP {npc.currentHitPoints ?? '—'}/{npc.maxHitPoints ?? '—'}
          </span>
        )}
      </div>

      <NpcDetailList label="Likes" value={npc.likes} />
      <NpcDetailList label="Dislikes" value={npc.dislikes} />
      <NpcDetailList label="Goals" value={npc.goals} />

      {npc.notes && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Notes</p>
          <p className="text-sm whitespace-pre-wrap">{npc.notes}</p>
        </div>
      )}

      {npc.statBlock && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            Stat block
          </p>
          <p className="text-sm">{npc.statBlock.monsterName}</p>
          <p className="text-xs text-muted-foreground">
            CR {formatChallengeRating(npc.statBlock.challengeRating)} · AC{' '}
            {npc.statBlock.armorClass} · HP {npc.statBlock.hitPoints}
          </p>
        </div>
      )}
    </div>
  )
}

function NpcDetailList({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  const items = (value ?? '')
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
  if (items.length === 0) return null

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <ul className="list-inside list-disc text-sm">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
