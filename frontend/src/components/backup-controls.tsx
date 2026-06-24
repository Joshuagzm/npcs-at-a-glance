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

// Export/Import controls for the Settings page. A backup file is a whole-system
// snapshot — every NPC and location — so this is a single system-level action
// rather than something scoped to a page. Importing replaces all current data.
export function BackupControls() {
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
  // Nothing to export when the whole system is empty.
  const systemIsEmpty =
    (npcsQuery.data?.length ?? 0) === 0 &&
    (locationsQuery.data?.length ?? 0) === 0

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          disabled={!dataReady || systemIsEmpty || saveMutation.isPending}
          title={
            dataReady && systemIsEmpty ? 'Nothing to export yet' : undefined
          }
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? 'Exporting…' : 'Export all data'}
        </Button>
        <Button
          variant="outline"
          disabled={restoreMutation.isPending}
          title={
            backup
              ? `Last exported ${new Date(backup.savedAt).toLocaleString()}`
              : 'No export saved yet'
          }
          onClick={() => restoreMutation.mutate()}
        >
          {restoreMutation.isPending ? 'Importing…' : 'Import data'}
        </Button>
      </div>
      {saveMutation.isError && (
        <p className="text-sm text-destructive">
          Failed to export data: {saveMutation.error.message}
        </p>
      )}
      {restoreMutation.isError && (
        <p className="text-sm text-destructive">
          Failed to import data: {restoreMutation.error.message}
        </p>
      )}
    </div>
  )
}
