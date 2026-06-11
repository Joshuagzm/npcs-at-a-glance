import { createNpc, deleteNpc, listNpcs, type Npc, type NpcInput } from './api'

// The backend stores NPCs in memory and loses them on restart; a
// localStorage snapshot lets the user save and restore their data.
const STORAGE_KEY = 'npc-management:backup'

export interface NpcBackup {
  savedAt: string
  npcs: Npc[]
}

export function toInput(npc: Npc): NpcInput {
  return {
    name: npc.name,
    role: npc.role,
    location: npc.location,
    level: npc.level,
    isHostile: npc.isHostile,
    notes: npc.notes,
    statBlock: npc.statBlock,
  }
}

// Compare on input fields only: ids and createdAt regenerate when a
// backup is restored, but the data is the same.
function fingerprint(npcs: Npc[]): string {
  return JSON.stringify(
    npcs
      .map(toInput)
      .sort(
        (a, b) => a.name.localeCompare(b.name) || a.role.localeCompare(b.role),
      ),
  )
}

export function saveBackup(npcs: Npc[]): NpcBackup {
  const backup: NpcBackup = { savedAt: new Date().toISOString(), npcs }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(backup))
  return backup
}

export function loadBackup(): NpcBackup | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const backup = JSON.parse(raw) as NpcBackup
    return Array.isArray(backup.npcs) ? backup : null
  } catch {
    return null
  }
}

export function hasUnsavedChanges(
  npcs: Npc[],
  backup: NpcBackup | null,
): boolean {
  if (!backup) return npcs.length > 0
  return fingerprint(npcs) !== fingerprint(backup.npcs)
}

/** Replace the server's NPCs with the backup's contents. */
export async function restoreBackup(backup: NpcBackup): Promise<void> {
  const current = await listNpcs()
  await Promise.all(current.map((npc) => deleteNpc(npc.id)))
  for (const npc of backup.npcs) {
    await createNpc(toInput(npc))
  }
}
