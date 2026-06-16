import {
  createLocation,
  createNpc,
  deleteLocation,
  deleteNpc,
  listLocations,
  listNpcs,
  type Location,
  type Npc,
  type NpcInput,
} from './api'

// Backups are JSON files the user saves to / loads from disk via the
// File System Access API (with a download / file-input fallback for
// browsers without it). localStorage keeps a copy of the last saved
// snapshot purely so unsaved-change detection survives page reloads.
const STORAGE_KEY = 'npc-management:backup'

export interface NpcBackup {
  savedAt: string
  npcs: Npc[]
  locations: Location[]
}

// Minimal File System Access API surface (not yet in the TS DOM lib).
interface BackupFileHandle {
  getFile(): Promise<File>
  createWritable(): Promise<{
    write(data: string): Promise<void>
    close(): Promise<void>
  }>
}

interface PickerWindow extends Window {
  showSaveFilePicker?: (options?: unknown) => Promise<BackupFileHandle>
  showOpenFilePicker?: (options?: unknown) => Promise<BackupFileHandle[]>
}

const FILE_TYPES = [
  {
    description: 'NPC backup (JSON)',
    accept: { 'application/json': ['.json'] },
  },
]

// A genuine user cancel is an AbortError - but so is the picker being
// suppressed by browser automation (Playwright/CDP intercepts file
// dialogs and rejects with "Intercepted by
// Page.setInterceptFileChooserDialog()"). Only the former should be a
// silent no-op; the latter falls back to the non-picker path.
function isCancellation(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    error.name === 'AbortError' &&
    !error.message.includes('Intercepted')
  )
}

function isPickerSuppressed(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    error.name === 'AbortError' &&
    error.message.includes('Intercepted')
  )
}

export function toInput(npc: Npc): NpcInput {
  return {
    name: npc.name,
    role: npc.role,
    locationId: npc.locationId,
    level: npc.level,
    isHostile: npc.isHostile,
    notes: npc.notes,
    likes: npc.likes ?? null,
    dislikes: npc.dislikes ?? null,
    goals: npc.goals ?? null,
    currentHitPoints: npc.currentHitPoints ?? null,
    maxHitPoints: npc.maxHitPoints ?? null,
    statBlock: npc.statBlock,
    portrait: npc.portrait ?? null,
  }
}

// Compare on stable content only: ids and createdAt regenerate when a
// backup is restored, so the npc/location link is compared by location
// name rather than by the id that changes on restore.
function fingerprint(npcs: Npc[], locations: Location[]): string {
  const nameById = new Map(locations.map((loc) => [loc.id, loc.name]))
  const npcPart = npcs
    .map((npc) => {
      const { locationId, ...rest } = toInput(npc)
      return {
        ...rest,
        location: locationId ? (nameById.get(locationId) ?? null) : null,
      }
    })
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name) ||
        (a.role ?? '').localeCompare(b.role ?? ''),
    )
  const locationPart = locations
    .map((loc) => ({ name: loc.name, notes: loc.notes ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return JSON.stringify({ npcs: npcPart, locations: locationPart })
}

function remember(backup: NpcBackup): NpcBackup {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(backup))
  return backup
}

export function lastSavedBackup(): NpcBackup | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const backup = JSON.parse(raw) as NpcBackup
    if (!Array.isArray(backup.npcs)) return null
    return { ...backup, locations: backup.locations ?? [] }
  } catch {
    return null
  }
}

export function hasUnsavedChanges(
  npcs: Npc[],
  locations: Location[],
  backup: NpcBackup | null,
): boolean {
  if (!backup) return npcs.length > 0 || locations.length > 0
  return (
    fingerprint(npcs, locations) !== fingerprint(backup.npcs, backup.locations)
  )
}

function parseBackup(raw: string): NpcBackup {
  let backup: NpcBackup
  try {
    backup = JSON.parse(raw) as NpcBackup
  } catch {
    throw new Error('That file is not valid JSON')
  }
  if (!Array.isArray(backup.npcs)) {
    throw new Error('That file is not an NPC backup')
  }
  // Locations were added later; tolerate backups saved before then.
  return { ...backup, locations: backup.locations ?? [] }
}

/** Save to a user-chosen file. Returns null if the user cancels. */
export async function saveBackupToFile(
  npcs: Npc[],
  locations: Location[],
): Promise<NpcBackup | null> {
  const backup: NpcBackup = {
    savedAt: new Date().toISOString(),
    npcs,
    locations,
  }
  const json = JSON.stringify(backup, null, 2)
  const suggestedName = `npc-backup-${backup.savedAt.slice(0, 10)}.json`

  const picker = window as PickerWindow
  if (picker.showSaveFilePicker) {
    try {
      const handle = await picker.showSaveFilePicker({
        suggestedName,
        types: FILE_TYPES,
      })
      const writable = await handle.createWritable()
      await writable.write(json)
      await writable.close()
      return remember(backup)
    } catch (error) {
      if (isCancellation(error)) return null
      if (!isPickerSuppressed(error)) throw error
      // Picker blocked (automation): fall through to the download path.
    }
  }

  // No usable File System Access API (e.g. Firefox): download instead.
  const url = URL.createObjectURL(
    new Blob([json], { type: 'application/json' }),
  )
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = suggestedName
  anchor.click()
  URL.revokeObjectURL(url)
  return remember(backup)
}

/** Let the user pick a backup file. Returns null if they cancel. */
export async function pickBackupFile(): Promise<NpcBackup | null> {
  const picker = window as PickerWindow
  if (picker.showOpenFilePicker) {
    try {
      const handles = await picker.showOpenFilePicker({ types: FILE_TYPES })
      const file = await handles[0].getFile()
      return parseBackup(await file.text())
    } catch (error) {
      if (isCancellation(error)) return null
      if (!isPickerSuppressed(error)) throw error
      // Picker blocked (automation): fall through to the file input.
    }
  }

  // Fallback: a hidden file input still opens a file explorer dialog.
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      file
        .text()
        .then((text) => resolve(parseBackup(text)))
        .catch(reject)
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}

/** Replace the server's NPCs and locations with the backup's contents. */
export async function restoreBackup(backup: NpcBackup): Promise<NpcBackup> {
  const [currentNpcs, currentLocations] = await Promise.all([
    listNpcs(),
    listLocations(),
  ])
  await Promise.all(currentNpcs.map((npc) => deleteNpc(npc.id)))
  await Promise.all(currentLocations.map((loc) => deleteLocation(loc.id)))

  // Recreate locations first, mapping each old id to its freshly assigned
  // one so the NPCs' locationId links survive the restore.
  const idByOldId = new Map<string, string>()
  for (const location of backup.locations) {
    const created = await createLocation({
      name: location.name,
      notes: location.notes ?? null,
    })
    idByOldId.set(location.id, created.id)
  }

  for (const npc of backup.npcs) {
    const input = toInput(npc)
    input.locationId = npc.locationId
      ? (idByOldId.get(npc.locationId) ?? null)
      : null
    await createNpc(input)
  }

  return remember(backup)
}
