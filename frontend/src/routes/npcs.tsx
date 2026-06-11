import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Textarea } from '@/components/ui/textarea'
import {
  createNpc,
  deleteNpc,
  listNpcs,
  updateNpc,
  type Npc,
  type NpcInput,
  type StatBlock,
} from '@/lib/api'
import {
  hasUnsavedChanges,
  loadBackup,
  restoreBackup,
  saveBackup,
} from '@/lib/backup'
import {
  fetchStatBlock,
  formatChallengeRating,
  searchMonsters,
} from '@/lib/srd'
import {
  generateName,
  RACE_LABELS,
  RACES,
  type Race,
} from '@/lib/nameGenerator'

export const Route = createFileRoute('/npcs')({
  component: NpcsPage,
})

function NpcsPage() {
  const queryClient = useQueryClient()
  const npcsQuery = useQuery({ queryKey: ['npcs'], queryFn: listNpcs })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Npc | null>(null)

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

  const [backup, setBackup] = useState(loadBackup)

  const restoreMutation = useMutation({
    mutationFn: restoreBackup,
    onSuccess: invalidate,
  })

  const unsaved =
    npcsQuery.isSuccess && hasUnsavedChanges(npcsQuery.data, backup)

  useEffect(() => {
    if (!unsaved) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // Required by older browsers for the prompt to appear.
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [unsaved])

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
          {unsaved && <Badge variant="outline">Unsaved changes</Badge>}
          <Button
            variant="outline"
            disabled={!npcsQuery.isSuccess}
            onClick={() => setBackup(saveBackup(npcsQuery.data ?? []))}
          >
            Save backup
          </Button>
          <Button
            variant="outline"
            disabled={!backup || restoreMutation.isPending}
            title={
              backup
                ? `Saved ${new Date(backup.savedAt).toLocaleString()}`
                : 'No backup saved yet'
            }
            onClick={() => {
              if (
                backup &&
                confirm(
                  `Replace the current NPCs with the backup saved ${new Date(
                    backup.savedAt,
                  ).toLocaleString()}?`,
                )
              ) {
                restoreMutation.mutate(backup)
              }
            }}
          >
            {restoreMutation.isPending ? 'Loading…' : 'Load backup'}
          </Button>
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

      {restoreMutation.isError && (
        <p className="text-destructive">
          Failed to load backup: {restoreMutation.error.message}
        </p>
      )}

      {npcsQuery.isPending && (
        <p className="text-muted-foreground">Loading NPCs…</p>
      )}

      {npcsQuery.isError && (
        <p className="text-destructive">
          Failed to load NPCs: {npcsQuery.error.message}. Is the backend running
          on port 5000?
        </p>
      )}

      {npcsQuery.isSuccess && npcsQuery.data.length === 0 && (
        <p className="text-muted-foreground">
          No NPCs yet — add your first one.
        </p>
      )}

      {npcsQuery.isSuccess && npcsQuery.data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Level</TableHead>
              <TableHead>Disposition</TableHead>
              <TableHead>Stat block</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {npcsQuery.data.map((npc) => (
              <TableRow key={npc.id}>
                <TableCell className="font-medium">
                  {npc.name}
                  {npc.notes && (
                    <p className="max-w-xs truncate text-xs text-muted-foreground">
                      {npc.notes}
                    </p>
                  )}
                </TableCell>
                <TableCell>{npc.role}</TableCell>
                <TableCell>{npc.location ?? '—'}</TableCell>
                <TableCell className="text-right">{npc.level}</TableCell>
                <TableCell>
                  {npc.isHostile ? (
                    <Badge variant="destructive">Hostile</Badge>
                  ) : (
                    <Badge variant="secondary">Friendly</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {npc.statBlock ? (
                    <>
                      {npc.statBlock.monsterName}
                      <p className="text-xs text-muted-foreground">
                        CR{' '}
                        {formatChallengeRating(npc.statBlock.challengeRating)} ·
                        AC {npc.statBlock.armorClass} · HP{' '}
                        {npc.statBlock.hitPoints}
                      </p>
                    </>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>
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
  const [name, setName] = useState(npc?.name ?? '')
  const [role, setRole] = useState(npc?.role ?? '')
  const [location, setLocation] = useState(npc?.location ?? '')
  const [level, setLevel] = useState(npc?.level ?? 1)
  const [isHostile, setIsHostile] = useState(npc?.isHostile ?? false)
  const [notes, setNotes] = useState(npc?.notes ?? '')
  const [race, setRace] = useState<Race>('human')
  const [statBlock, setStatBlock] = useState<StatBlock | null>(
    npc?.statBlock ?? null,
  )
  const [monsterSearch, setMonsterSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')

  const monstersQuery = useQuery({
    queryKey: ['srd-monsters', submittedSearch],
    queryFn: () => searchMonsters(submittedSearch),
    enabled: submittedSearch.length > 0,
  })

  const statBlockMutation = useMutation({
    mutationFn: fetchStatBlock,
    onSuccess: (block) => {
      setStatBlock(block)
      setMonsterSearch('')
      setSubmittedSearch('')
    },
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onSubmit({
      name: name.trim(),
      role: role.trim(),
      location: location.trim() || null,
      level,
      isHostile,
      notes: notes.trim() || null,
      statBlock,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{npc ? `Edit ${npc.name}` : 'Add NPC'}</DialogTitle>
          <DialogDescription>
            {npc ? 'Update the details below.' : 'Describe the new character.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="npc-name">Name</Label>
              <Input
                id="npc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="npc-role">Role</Label>
              <Input
                id="npc-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Merchant, Guard, …"
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={race}
              onValueChange={(value) => setRace(value as Race)}
            >
              <SelectTrigger className="w-44" aria-label="Race for random name">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RACES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {RACE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              onClick={() => setName(generateName(race))}
            >
              Random name
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="npc-location">Location</Label>
              <Input
                id="npc-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="npc-level">Level (1–100)</Label>
              <Input
                id="npc-level"
                type="number"
                min={1}
                max={100}
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="npc-notes">Notes</Label>
            <Textarea
              id="npc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="npc-hostile"
              checked={isHostile}
              onCheckedChange={(checked) => setIsHostile(checked === true)}
            />
            <Label htmlFor="npc-hostile">Hostile toward players</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="npc-monster">Stat block (5e SRD)</Label>
            {statBlock ? (
              <div className="space-y-1 rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {statBlock.monsterName}
                    <span className="text-muted-foreground">
                      {' '}
                      — {statBlock.size} {statBlock.type}, CR{' '}
                      {formatChallengeRating(statBlock.challengeRating)}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStatBlock(null)}
                  >
                    Remove
                  </Button>
                </div>
                <p className="text-muted-foreground">
                  AC {statBlock.armorClass} · HP {statBlock.hitPoints} · Speed{' '}
                  {statBlock.speed}
                </p>
                <p className="text-muted-foreground">
                  STR {statBlock.strength} · DEX {statBlock.dexterity} · CON{' '}
                  {statBlock.constitution} · INT {statBlock.intelligence} · WIS{' '}
                  {statBlock.wisdom} · CHA {statBlock.charisma}
                </p>
                {statBlock.flavorText && (
                  <p className="max-h-24 overflow-y-auto border-t pt-1 text-xs text-muted-foreground italic">
                    {statBlock.flavorText}
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Input
                    id="npc-monster"
                    value={monsterSearch}
                    onChange={(e) => setMonsterSearch(e.target.value)}
                    placeholder="Search monsters — goblin, mage, …"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        setSubmittedSearch(monsterSearch.trim())
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSubmittedSearch(monsterSearch.trim())}
                  >
                    Search
                  </Button>
                </div>
                {monstersQuery.isFetching && (
                  <p className="text-sm text-muted-foreground">Searching…</p>
                )}
                {monstersQuery.isError && (
                  <p className="text-sm text-destructive">
                    {monstersQuery.error.message}
                  </p>
                )}
                {monstersQuery.isSuccess && monstersQuery.data.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No monsters matched.
                  </p>
                )}
                {monstersQuery.isSuccess && monstersQuery.data.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {monstersQuery.data.slice(0, 8).map((monster) => (
                      <Button
                        key={monster.index}
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={statBlockMutation.isPending}
                        onClick={() => statBlockMutation.mutate(monster.index)}
                      >
                        {monster.name}
                      </Button>
                    ))}
                  </div>
                )}
                {statBlockMutation.isError && (
                  <p className="text-sm text-destructive">
                    {statBlockMutation.error.message}
                  </p>
                )}
              </>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : npc ? 'Save changes' : 'Create NPC'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
