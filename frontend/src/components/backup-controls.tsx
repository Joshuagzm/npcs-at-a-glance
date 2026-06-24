import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { listLocations, listNpcs } from '@/lib/api'
import {
  lastSavedBackup,
  pickBackupFile,
  restoreBackup,
  saveBackupToFile,
  type NpcBackup,
} from '@/lib/backup'

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? '' : 's'}`

// Export/Import controls for the Settings page. A backup file is a whole-system
// snapshot — every NPC and location — so this is a single system-level action
// rather than something scoped to a page. Importing replaces all current data,
// gated behind a confirmation dialog.
export function BackupControls() {
  const queryClient = useQueryClient()
  const npcsQuery = useQuery({ queryKey: ['npcs'], queryFn: listNpcs })
  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: listLocations,
  })

  const [backup, setBackup] = useState(lastSavedBackup)
  // The picked-but-not-yet-applied import; non-null means the confirm dialog
  // is open. Restore only runs once the user confirms.
  const [pendingImport, setPendingImport] = useState<NpcBackup | null>(null)
  const [isPicking, setIsPicking] = useState(false)
  const [pickError, setPickError] = useState<string | null>(null)

  const saveMutation = useMutation({
    mutationFn: () =>
      saveBackupToFile(npcsQuery.data ?? [], locationsQuery.data ?? []),
    onSuccess: (saved) => {
      if (saved) setBackup(saved)
    },
  })

  const restoreMutation = useMutation({
    mutationFn: (picked: NpcBackup) => restoreBackup(picked),
    onSuccess: (restored) => {
      setBackup(restored)
      queryClient.invalidateQueries({ queryKey: ['npcs'] })
      queryClient.invalidateQueries({ queryKey: ['locations'] })
    },
  })

  const handlePickImport = async () => {
    setPickError(null)
    setIsPicking(true)
    try {
      const picked = await pickBackupFile()
      if (picked) setPendingImport(picked)
    } catch (error) {
      setPickError(
        error instanceof Error ? error.message : 'Could not open that file.',
      )
    } finally {
      setIsPicking(false)
    }
  }

  const confirmImport = () => {
    if (pendingImport) restoreMutation.mutate(pendingImport)
    // Dialog also closes itself via onOpenChange; clearing here keeps the
    // controlled `open` state in sync.
    setPendingImport(null)
  }

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
          disabled={isPicking || restoreMutation.isPending}
          title={
            backup
              ? `Last exported ${new Date(backup.savedAt).toLocaleString()}`
              : 'No export saved yet'
          }
          onClick={handlePickImport}
        >
          {restoreMutation.isPending ? 'Importing…' : 'Import data'}
        </Button>
      </div>
      {saveMutation.isError && (
        <p className="text-sm text-destructive">
          Failed to export data: {saveMutation.error.message}
        </p>
      )}
      {pickError && <p className="text-sm text-destructive">{pickError}</p>}
      {restoreMutation.isError && (
        <p className="text-sm text-destructive">
          Failed to import data: {restoreMutation.error.message}
        </p>
      )}

      <AlertDialog
        open={pendingImport !== null}
        onOpenChange={(open) => {
          if (!open) setPendingImport(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace all data?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingImport && (
                <>
                  This replaces the current NPCs and locations with the export
                  saved {new Date(pendingImport.savedAt).toLocaleString()} (
                  {plural(pendingImport.npcs.length, 'NPC')},{' '}
                  {plural(pendingImport.locations.length, 'location')}). This
                  can't be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmImport}>
              Replace all data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
