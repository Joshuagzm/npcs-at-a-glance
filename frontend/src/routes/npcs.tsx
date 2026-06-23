import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  createNpc,
  deleteNpc,
  listLocations,
  listNpcs,
  updateNpc,
  type Npc,
  type NpcInput,
} from '@/lib/api'
import { BackupControls } from '@/components/backup-controls'
import { useAppForm } from '@/components/form/app-form'
import { HitPointsField } from '@/components/npc-form/hit-points-field'
import { PortraitPanel } from '@/components/npc-form/portrait-panel'
import { StatBlockPicker } from '@/components/npc-form/stat-block-picker'
import {
  npcFormOptions,
  npcFormSchema,
  npcToFormValues,
  RACE_OPTIONS,
  splitList,
  toNpcInput,
} from '@/components/npc-form/npc-form'
import { formatChallengeRating } from '@/lib/srd'
import { generateName } from '@/lib/nameGenerator'

export const Route = createFileRoute('/npcs')({
  component: NpcsPage,
})

function NpcsPage() {
  const queryClient = useQueryClient()
  const npcsQuery = useQuery({ queryKey: ['npcs'], queryFn: listNpcs })
  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: listLocations,
  })
  const locations = locationsQuery.data ?? []
  const locationNames = new Map(locations.map((loc) => [loc.id, loc.name]))

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Npc | null>(null)
  // 'all' shows everyone; 'none' shows NPCs with no location; otherwise a
  // location id.
  const [locationFilter, setLocationFilter] = useState('all')

  const closeDialog = () => {
    setDialogOpen(false)
    setEditing(null)
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['npcs'] })

  const createMutation = useMutation({
    mutationFn: createNpc,
    onSuccess: () => {
      invalidate()
      closeDialog()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: NpcInput }) =>
      updateNpc(id, input),
    onSuccess: () => {
      invalidate()
      closeDialog()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteNpc,
    onSuccess: invalidate,
  })

  const handleSubmit = (input: NpcInput) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, input })
    } else {
      createMutation.mutate(input)
    }
  }

  const submitError = editing ? updateMutation.error : createMutation.error
  const submitPending = editing
    ? updateMutation.isPending
    : createMutation.isPending

  const allNpcs = npcsQuery.data ?? []
  const filteredNpcs = allNpcs.filter((npc) => {
    if (locationFilter === 'all') return true
    if (locationFilter === 'none') return npc.locationId == null
    return npc.locationId === locationFilter
  })

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">NPCs</h1>
          <p className="text-muted-foreground">
            Everyone your players might meet.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BackupControls />
          <Button
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            Add NPC
          </Button>
        </div>
      </div>

      {npcsQuery.isPending && (
        <p className="text-muted-foreground">Loading NPCs…</p>
      )}

      {npcsQuery.isError && (
        <p className="text-destructive">
          Failed to load NPCs: {npcsQuery.error.message}. Is the backend running
          on port 5000?
        </p>
      )}

      {npcsQuery.isSuccess && allNpcs.length === 0 && (
        <p className="text-muted-foreground">
          No NPCs yet — add your first one.
        </p>
      )}

      {npcsQuery.isSuccess && allNpcs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Label
              htmlFor="npc-location-filter"
              className="text-sm text-muted-foreground"
            >
              Filter by location
            </Label>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger id="npc-location-filter" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                <SelectItem value="none">No location</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredNpcs.length === 0 ? (
            <p className="text-muted-foreground">
              No NPCs match this location.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Level</TableHead>
                  <TableHead>Disposition</TableHead>
                  <TableHead>Personality</TableHead>
                  <TableHead>Stat block</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNpcs.map((npc) => (
                  <TableRow
                    key={npc.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setEditing(npc)
                      setDialogOpen(true)
                    }}
                  >
                    <TableCell className="font-medium">
                      {npc.name}
                      {npc.notes && (
                        <p className="max-w-xs truncate text-xs text-muted-foreground">
                          {npc.notes}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{npc.role ?? '—'}</TableCell>
                    <TableCell>
                      {(npc.locationId && locationNames.get(npc.locationId)) ??
                        '—'}
                    </TableCell>
                    <TableCell className="text-right">{npc.level}</TableCell>
                    <TableCell>
                      {npc.isHostile ? (
                        <Badge variant="destructive">Hostile</Badge>
                      ) : (
                        <Badge variant="secondary">Friendly</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {npc.likes || npc.dislikes || npc.goals ? (
                        <div className="max-w-56 space-y-0.5 text-xs">
                          {npc.likes && (
                            <p className="truncate">
                              <span className="text-muted-foreground">
                                Likes:
                              </span>{' '}
                              {splitList(npc.likes).join(', ')}
                            </p>
                          )}
                          {npc.dislikes && (
                            <p className="truncate">
                              <span className="text-muted-foreground">
                                Dislikes:
                              </span>{' '}
                              {splitList(npc.dislikes).join(', ')}
                            </p>
                          )}
                          {npc.goals && (
                            <p className="truncate">
                              <span className="text-muted-foreground">
                                Goals:
                              </span>{' '}
                              {splitList(npc.goals).join(', ')}
                            </p>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {npc.statBlock ? (
                        <>
                          {npc.statBlock.monsterName}
                          <p className="text-xs text-muted-foreground">
                            CR{' '}
                            {formatChallengeRating(
                              npc.statBlock.challengeRating,
                            )}{' '}
                            · AC {npc.statBlock.armorClass} · HP{' '}
                            {npc.statBlock.hitPoints}
                          </p>
                        </>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditing(npc)
                            setDialogOpen(true)
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm(`Delete ${npc.name}?`)) {
                              deleteMutation.mutate(npc.id)
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
        </div>
      )}

      {deleteMutation.isError && (
        <p className="text-destructive">
          Failed to delete: {deleteMutation.error.message}
        </p>
      )}

      <NpcFormDialog
        key={dialogOpen ? (editing?.id ?? 'create') : 'closed'}
        open={dialogOpen}
        onClose={closeDialog}
        npc={editing}
        onSubmit={handleSubmit}
        pending={submitPending}
        error={submitError}
      />
    </section>
  )
}

interface NpcFormDialogProps {
  open: boolean
  onClose: () => void
  npc: Npc | null
  onSubmit: (input: NpcInput) => void
  pending: boolean
  error: Error | null
}

function NpcFormDialog({
  open,
  onClose,
  npc,
  onSubmit,
  pending,
  error,
}: NpcFormDialogProps) {
  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: listLocations,
  })
  const locationOptions = (locationsQuery.data ?? []).map((loc) => ({
    value: loc.id,
    label: loc.name,
  }))

  const form = useAppForm({
    ...npcFormOptions,
    defaultValues: npcToFormValues(npc),
    validators: { onMount: npcFormSchema, onChange: npcFormSchema },
    onSubmit: ({ value }) => onSubmit(toNpcInput(value)),
  })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] w-3/4 max-w-none overflow-y-auto sm:max-w-none">
        <DialogHeader>
          <DialogTitle>{npc ? `Edit ${npc.name}` : 'Add NPC'}</DialogTitle>
          <DialogDescription>
            {npc ? 'Update the details below.' : 'Describe the new character.'}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="space-y-4"
        >
          <div className="flex gap-6">
            {/* Portrait panel — the appearance fields feed its prompt. */}
            <PortraitPanel form={form} />
            {/* Main portion */}
            <div className="grid flex-1 grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <form.AppField name="name">
                    {(field) => <field.TextField label="Name" required />}
                  </form.AppField>
                  <form.AppField name="role">
                    {(field) => (
                      <field.TextField
                        label="Role"
                        placeholder="Merchant, Guard, …"
                      />
                    )}
                  </form.AppField>
                </div>
                <div className="flex items-center gap-2">
                  <form.AppField name="race">
                    {(field) => (
                      <field.SelectField
                        options={RACE_OPTIONS}
                        className="w-44"
                        ariaLabel="Race for random name"
                      />
                    )}
                  </form.AppField>
                  <form.Subscribe selector={(state) => state.values.race}>
                    {(race) => (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          form.setFieldValue('name', generateName(race))
                        }
                      >
                        Random name
                      </Button>
                    )}
                  </form.Subscribe>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <form.AppField name="locationId">
                    {(field) => (
                      <field.SelectField
                        label="Location"
                        options={locationOptions}
                        placeholder="No location"
                        className="w-full"
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="level">
                    {(field) => (
                      <field.NumberField label="Level (1–20)" min={1} max={20} />
                    )}
                  </form.AppField>
                </div>
                <HitPointsField form={form} />
                <div className="grid grid-cols-2 gap-4">
                  <form.AppField name="likes">
                    {(field) => (
                      <field.EditableListField
                        label="Likes"
                        placeholder="Fine ale, gossip, …"
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="dislikes">
                    {(field) => (
                      <field.EditableListField
                        label="Dislikes"
                        placeholder="Nobles, loud noises, …"
                      />
                    )}
                  </form.AppField>
                </div>
                <form.AppField name="goals">
                  {(field) => (
                    <field.EditableListField
                      label="Goals"
                      placeholder="What does this character want?"
                    />
                  )}
                </form.AppField>
                <form.AppField name="notes">
                  {(field) => <field.TextareaField label="Notes" rows={3} />}
                </form.AppField>
                <form.AppField name="isHostile">
                  {(field) => (
                    <field.CheckboxField label="Hostile toward players" />
                  )}
                </form.AppField>
              </div>
              <StatBlockPicker form={form} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <form.AppForm>
              <form.SubmitButton
                label={npc ? 'Save changes' : 'Create NPC'}
                pendingLabel="Saving…"
                pending={pending}
              />
            </form.AppForm>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
