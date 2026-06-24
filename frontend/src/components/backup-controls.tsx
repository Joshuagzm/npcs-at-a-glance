import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { listLocations, listNpcs } from '@/lib/api'
import {
  lastSavedBackup,
  pickBackupFile,
  restoreBackup,
  saveBackupToFile,
} from '@/lib/backup'

// Save/Load backup buttons, shared by the NPCs and Locations pages. A backup
// file holds both NPCs and locations, so saving or restoring from either page
// covers the whole snapshot. `scope` is the page this instance lives on: Save
// is disabled when that page has no entries (nothing worth backing up here).
export function BackupControls({ scope }: { scope: 'npcs' | 'locations' }) {
  const queryClient = useQueryClient()
  const npcsQuery = useQuery({ queryKey: ['npcs'], queryFn: listNpcs })
  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: listLocations,
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
      const npcCount = picked.npcs.length
      const locationCount = picked.locations.length
      if (
        !confirm(
          `Replace the current NPCs and locations with the backup saved ${when} ` +
            `(${npcCount} NPC${npcCount === 1 ? '' : 's'}, ` +
            `${locationCount} location${locationCount === 1 ? '' : 's'})?`,
        )
      ) {
        return null
      }
      return restoreBackup(picked)
    },
    onSuccess: (restored) => {
      if (restored) {
        setBackup(restored)
        queryClient.invalidateQueries({ queryKey: ['npcs'] })
        queryClient.invalidateQueries({ queryKey: ['locations'] })
      }
    },
  })

  const dataReady = npcsQuery.isSuccess && locationsQuery.isSuccess

  // Disable Save when this page has nothing to back up.
  const scopeData = scope === 'npcs' ? npcsQuery.data : locationsQuery.data
  const scopeIsEmpty = (scopeData?.length ?? 0) === 0

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          disabled={!dataReady || scopeIsEmpty || saveMutation.isPending}
          title={
            dataReady && scopeIsEmpty
              ? `No ${scope === 'npcs' ? 'NPCs' : 'locations'} to back up`
              : undefined
          }
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
      </div>
      {saveMutation.isError && (
        <p className="text-sm text-destructive">
          Failed to save backup: {saveMutation.error.message}
        </p>
      )}
      {restoreMutation.isError && (
        <p className="text-sm text-destructive">
          Failed to load backup: {restoreMutation.error.message}
        </p>
      )}
    </div>
  )
}
