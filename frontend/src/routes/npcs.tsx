import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { EditableList } from '@/components/editable-list'
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
  generatePortrait,
  listLocations,
  listNpcs,
  updateNpc,
  type Npc,
  type NpcInput,
  type StatBlock,
} from '@/lib/api'
import {
  hasUnsavedChanges,
  lastSavedBackup,
  pickBackupFile,
  restoreBackup,
  saveBackupToFile,
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

// Radix Select items can't use an empty value, so a sentinel stands in for
// "no location assigned".
const NO_LOCATION = '__none__'

// Likes/dislikes/goals are stored as a single newline-joined string, but
// edited and displayed as a list of entries.
function splitList(value: string | null | undefined): string[] {
  return (value ?? '')
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function joinList(items: string[]): string | null {
  return items.length > 0 ? items.join('\n') : null
}

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

  const [backup, setBackup] = useState(lastSavedBackup)

  const saveMutation = useMutation({
    mutationFn: () =>
      saveBackupToFile(npcsQuery.data ?? [], locationsQuery.data ?? []),
    onSuccess: (saved) => {
      if (saved) setBackup(saved)
    },
  })

  const restoreMutation = useMutation({
    mutationFn: async () => {
      const picked = await pickBackupFile()
      if (!picked) return null
      const when = new Date(picked.savedAt).toLocaleString()
      if (
        !confirm(
          `Replace the current NPCs with the backup saved ${when} ` +
            `(${picked.npcs.length} NPC${picked.npcs.length === 1 ? '' : 's'})?`,
        )
      ) {
        return null
      }
      return restoreBackup(picked)
    },
    onSuccess: (restored) => {
      if (restored) {
        setBackup(restored)
        invalidate()
      }
    },
  })

  const unsaved =
    npcsQuery.isSuccess &&
    hasUnsavedChanges(npcsQuery.data, locationsQuery.data ?? [], backup)

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
          {unsaved && <Badge variant="outline">Unsaved changes</Badge>}
          <Button
            variant="outline"
            disabled={!npcsQuery.isSuccess || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save backup'}
          </Button>
          <Button
            variant="outline"
            disabled={restoreMutation.isPending}
            title={
              backup
                ? `Last saved ${new Date(backup.savedAt).toLocaleString()}`
                : 'No backup saved yet'
            }
            onClick={() => restoreMutation.mutate()}
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

      {saveMutation.isError && (
        <p className="text-destructive">
          Failed to save backup: {saveMutation.error.message}
        </p>
      )}

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
  const [name, setName] = useState(npc?.name ?? '')
  const [role, setRole] = useState(npc?.role ?? '')
  const [locationId, setLocationId] = useState(npc?.locationId ?? '')
  const [level, setLevel] = useState(npc?.level ?? 1)
  const [isHostile, setIsHostile] = useState(npc?.isHostile ?? false)
  const [notes, setNotes] = useState(npc?.notes ?? '')
  const [likes, setLikes] = useState<string[]>(() => splitList(npc?.likes))
  const [dislikes, setDislikes] = useState<string[]>(() =>
    splitList(npc?.dislikes),
  )
  const [goals, setGoals] = useState<string[]>(() => splitList(npc?.goals))
  const [currentHp, setCurrentHp] = useState(
    npc?.currentHitPoints?.toString() ?? '',
  )
  const [maxHp, setMaxHp] = useState(npc?.maxHitPoints?.toString() ?? '')
  const [race, setRace] = useState<Race>('human')
  const [portrait, setPortrait] = useState<string | null>(npc?.portrait ?? null)
  const [statBlock, setStatBlock] = useState<StatBlock | null>(
    npc?.statBlock ?? null,
  )

  const portraitMutation = useMutation({
    mutationFn: () =>
      generatePortrait({
        race: RACE_LABELS[race],
        role: role.trim() || null,
        name: name.trim() || null,
        isHostile,
      }),
    onSuccess: setPortrait,
  })
  const [monsterSearch, setMonsterSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')

  const monstersQuery = useQuery({
    queryKey: ['srd-monsters', submittedSearch],
    queryFn: () => searchMonsters(submittedSearch),
    enabled: submittedSearch.length > 0,
  })

  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: listLocations,
  })
  const locations = locationsQuery.data ?? []

  const statBlockMutation = useMutation({
    mutationFn: fetchStatBlock,
    onSuccess: (block) => {
      setStatBlock(block)
      // Seed the HP tracker from the monster unless already tracked.
      setMaxHp((prev) => prev || String(block.hitPoints))
      setCurrentHp((prev) => prev || String(block.hitPoints))
      setMonsterSearch('')
      setSubmittedSearch('')
    },
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onSubmit({
      name: name.trim(),
      role: role.trim() || null,
      locationId: locationId || null,
      level,
      isHostile,
      notes: notes.trim() || null,
      likes: joinList(likes),
      dislikes: joinList(dislikes),
      goals: joinList(goals),
      currentHitPoints: currentHp === '' ? null : Number(currentHp),
      maxHitPoints: maxHp === '' ? null : Number(maxHp),
      statBlock,
      portrait,
    })
  }

  // Older saved NPCs predate traits/actions on the stat block.
  const statBlockTraits = statBlock?.traits ?? []
  const statBlockActions = statBlock?.actions ?? []

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] w-1/2 max-w-none overflow-y-auto sm:max-w-none">
        <DialogHeader>
          <DialogTitle>{npc ? `Edit ${npc.name}` : 'Add NPC'}</DialogTitle>
          <DialogDescription>
            {npc ? 'Update the details below.' : 'Describe the new character.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
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
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={race}
                  onValueChange={(value) => setRace(value as Race)}
                >
                  <SelectTrigger
                    className="w-44"
                    aria-label="Race for random name"
                  >
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
                  <Select
                    value={locationId || NO_LOCATION}
                    onValueChange={(value) =>
                      setLocationId(value === NO_LOCATION ? '' : value)
                    }
                  >
                    <SelectTrigger id="npc-location" className="w-full">
                      <SelectValue placeholder="No location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_LOCATION}>No location</SelectItem>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <Label>Hit points</Label>
                <div className="flex items-end gap-3">
                  <div className="space-y-1">
                    <Label
                      htmlFor="npc-current-hp"
                      className="text-xs font-normal text-muted-foreground"
                    >
                      Current
                    </Label>
                    <Input
                      id="npc-current-hp"
                      type="number"
                      min={0}
                      max={maxHp === '' ? 1000 : Number(maxHp)}
                      className="w-20 text-center"
                      placeholder="—"
                      aria-label="Current hit points"
                      value={currentHp}
                      onChange={(e) => setCurrentHp(e.target.value)}
                      onBlur={() => {
                        // Clip current HP down to max if it overshoots.
                        if (
                          currentHp !== '' &&
                          maxHp !== '' &&
                          Number(currentHp) > Number(maxHp)
                        ) {
                          setCurrentHp(maxHp)
                        }
                      }}
                    />
                  </div>
                  <span className="pb-2 text-muted-foreground">/</span>
                  <div className="space-y-1">
                    <Label
                      htmlFor="npc-max-hp"
                      className="text-xs font-normal text-muted-foreground"
                    >
                      Max
                    </Label>
                    <Input
                      id="npc-max-hp"
                      type="number"
                      min={1}
                      max={1000}
                      className="w-20 text-center"
                      placeholder="—"
                      aria-label="Maximum hit points"
                      value={maxHp}
                      onChange={(e) => setMaxHp(e.target.value)}
                      onBlur={() => {
                        // Only commit the clip on blur, so typing a larger
                        // max doesn't momentarily drag current HP down.
                        if (
                          currentHp !== '' &&
                          maxHp !== '' &&
                          Number(currentHp) > Number(maxHp)
                        ) {
                          setCurrentHp(maxHp)
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <EditableList
                  id="npc-likes"
                  label="Likes"
                  items={likes}
                  onChange={setLikes}
                  placeholder="Fine ale, gossip, …"
                />
                <EditableList
                  id="npc-dislikes"
                  label="Dislikes"
                  items={dislikes}
                  onChange={setDislikes}
                  placeholder="Nobles, loud noises, …"
                />
              </div>
              <EditableList
                id="npc-goals"
                label="Goals"
                items={goals}
                onChange={setGoals}
                placeholder="What does this character want?"
              />
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
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Portrait</Label>
                  <div className="flex gap-2">
                    {portrait && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPortrait(null)}
                      >
                        Remove
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={portraitMutation.isPending}
                      onClick={() => portraitMutation.mutate()}
                    >
                      {portraitMutation.isPending
                        ? 'Generating…'
                        : portrait
                          ? 'Regenerate'
                          : 'Generate portrait'}
                    </Button>
                  </div>
                </div>
                {portrait ? (
                  <img
                    src={`data:image/png;base64,${portrait}`}
                    alt={`Portrait of ${name || 'this NPC'}`}
                    className="mx-auto max-h-96 rounded-md border"
                  />
                ) : (
                  <div className="flex aspect-2/3 max-h-96 w-full items-center justify-center rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                    {portraitMutation.isPending
                      ? 'Generating portrait — this can take up to a couple of minutes…'
                      : 'No portrait yet. Generate one from the race and role.'}
                  </div>
                )}
                {portraitMutation.isError && (
                  <p className="text-sm text-destructive">
                    {portraitMutation.error.message}
                  </p>
                )}
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
                      AC {statBlock.armorClass} · HP {statBlock.hitPoints} ·
                      Speed {statBlock.speed}
                    </p>
                    <p className="text-muted-foreground">
                      STR {statBlock.strength} · DEX {statBlock.dexterity} · CON{' '}
                      {statBlock.constitution} · INT {statBlock.intelligence} ·
                      WIS {statBlock.wisdom} · CHA {statBlock.charisma}
                    </p>
                    {statBlock.flavorText && (
                      <p className="max-h-24 overflow-y-auto border-t pt-1 text-xs text-muted-foreground italic">
                        {statBlock.flavorText}
                      </p>
                    )}
                    {(statBlockTraits.length > 0 ||
                      statBlockActions.length > 0) && (
                      <div className="max-h-80 space-y-3 overflow-y-auto border-t pt-2">
                        {statBlockTraits.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold tracking-wide uppercase">
                              Traits
                            </p>
                            {statBlockTraits.map((trait) => (
                              <p
                                key={trait.name}
                                className="text-xs text-muted-foreground"
                              >
                                <span className="font-medium text-foreground">
                                  {trait.name}.
                                </span>{' '}
                                {trait.description}
                              </p>
                            ))}
                          </div>
                        )}
                        {statBlockActions.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold tracking-wide uppercase">
                              Actions
                            </p>
                            {statBlockActions.map((action) => (
                              <p
                                key={action.name}
                                className="text-xs text-muted-foreground"
                              >
                                <span className="font-medium text-foreground">
                                  {action.name}.
                                </span>{' '}
                                {action.description}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
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
                      <p className="text-sm text-muted-foreground">
                        Searching…
                      </p>
                    )}
                    {monstersQuery.isError && (
                      <p className="text-sm text-destructive">
                        {monstersQuery.error.message}
                      </p>
                    )}
                    {monstersQuery.isSuccess &&
                      monstersQuery.data.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No monsters matched.
                        </p>
                      )}
                    {monstersQuery.isSuccess &&
                      monstersQuery.data.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {monstersQuery.data.slice(0, 8).map((monster) => (
                            <Button
                              key={monster.index}
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={statBlockMutation.isPending}
                              onClick={() =>
                                statBlockMutation.mutate(monster.index)
                              }
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
            </div>
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
