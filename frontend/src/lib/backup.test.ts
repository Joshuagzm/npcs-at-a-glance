import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Location, Npc } from './api'
import {
  lastSavedBackup,
  pickBackupFile,
  restoreBackup,
  saveBackupToFile,
  toInput,
  type NpcBackup,
} from './backup'

vi.mock('./api', () => ({
  listNpcs: vi.fn(),
  createNpc: vi.fn(),
  deleteNpc: vi.fn(),
  listLocations: vi.fn(),
  createLocation: vi.fn(),
  deleteLocation: vi.fn(),
}))

import {
  createLocation,
  createNpc,
  deleteLocation,
  deleteNpc,
  listLocations,
  listNpcs,
} from './api'

const STORAGE_KEY = 'npc-management:backup'

function makeNpc(overrides: Partial<Npc> = {}): Npc {
  return {
    id: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    name: 'Greta Ironhand',
    role: 'Blacksmith',
    locationId: null,
    level: 12,
    isHostile: false,
    notes: null,
    likes: 'Well-forged steel',
    dislikes: 'Elves',
    goals: null,
    currentHitPoints: 7,
    maxHitPoints: 7,
    statBlock: {
      monsterName: 'Goblin',
      size: 'Small',
      type: 'humanoid',
      armorClass: 15,
      hitPoints: 7,
      speed: '30 ft.',
      strength: 8,
      dexterity: 14,
      constitution: 10,
      intelligence: 10,
      wisdom: 8,
      charisma: 8,
      challengeRating: 0.25,
      flavorText: 'Small, black-hearted, selfish humanoids.',
      traits: [
        {
          name: 'Nimble Escape',
          description:
            'The goblin can take the Disengage or Hide action as a bonus action.',
        },
      ],
      actions: [
        {
          name: 'Scimitar',
          description:
            'Melee Weapon Attack: +4 to hit, reach 5 ft., one target.',
        },
      ],
    },
    portrait: null,
    portraitSeed: null,
    race: 'dwarf',
    gender: 'Female',
    age: 'Adult',
    skinColor: null,
    appearanceDetails: null,
    createdAt: '2026-06-11T00:00:00Z',
    ...overrides,
  }
}

function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    name: 'Ironforge Quarter',
    notes: null,
    createdAt: '2026-06-11T00:00:00Z',
    ...overrides,
  }
}

function makeBackup(npcs: Npc[], locations: Location[] = []): NpcBackup {
  return { savedAt: '2026-06-11T10:00:00Z', npcs, locations }
}

interface PickerWindow {
  showSaveFilePicker?: (options?: unknown) => unknown
  showOpenFilePicker?: (options?: unknown) => unknown
}

const pickerWindow = window as PickerWindow

function stubSavePicker(sink: { written: string | null }) {
  pickerWindow.showSaveFilePicker = vi.fn(async () => ({
    createWritable: async () => ({
      write: async (data: string) => {
        sink.written = data
      },
      close: async () => {},
    }),
  }))
}

function stubOpenPicker(contents: string) {
  pickerWindow.showOpenFilePicker = vi.fn(async () => [
    {
      getFile: async () =>
        new File([contents], 'backup.json', { type: 'application/json' }),
    },
  ])
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  delete pickerWindow.showSaveFilePicker
  delete pickerWindow.showOpenFilePicker
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('saveBackupToFile', () => {
  it('writes the NPCs as JSON to the chosen file and remembers the snapshot', async () => {
    const sink = { written: null as string | null }
    stubSavePicker(sink)
    const npcs = [makeNpc(), makeNpc({ name: 'Bob', role: 'Informant' })]

    const backup = await saveBackupToFile(npcs, [])

    expect(backup).not.toBeNull()
    expect(sink.written).not.toBeNull()
    const written = JSON.parse(sink.written!) as NpcBackup
    expect(written.npcs).toHaveLength(2)
    expect(written.npcs.map((n) => n.name)).toEqual(['Greta Ironhand', 'Bob'])
    expect(written.savedAt).toBe(backup!.savedAt)
    expect(lastSavedBackup()?.savedAt).toBe(backup!.savedAt)
  })

  it('returns null and saves nothing when the user cancels the picker', async () => {
    pickerWindow.showSaveFilePicker = vi.fn(async () => {
      throw new DOMException('user cancelled', 'AbortError')
    })

    const backup = await saveBackupToFile([makeNpc()], [])

    expect(backup).toBeNull()
    expect(lastSavedBackup()).toBeNull()
  })

  it('rethrows picker failures that are not cancellations', async () => {
    pickerWindow.showSaveFilePicker = vi.fn(async () => {
      throw new DOMException('blocked', 'SecurityError')
    })

    await expect(saveBackupToFile([makeNpc()], [])).rejects.toThrow('blocked')
    expect(lastSavedBackup()).toBeNull()
  })

  it('falls back to a download when automation suppresses the picker', async () => {
    pickerWindow.showSaveFilePicker = vi.fn(async () => {
      throw new DOMException(
        "Failed to execute 'showSaveFilePicker' on 'Window': Intercepted by Page.setInterceptFileChooserDialog().",
        'AbortError',
      )
    })
    const createObjectURL = vi.fn(() => 'blob:fake')
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() })
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    const backup = await saveBackupToFile([makeNpc()], [])

    expect(backup).not.toBeNull()
    expect(click).toHaveBeenCalledOnce()
    expect(lastSavedBackup()?.npcs).toHaveLength(1)

    vi.unstubAllGlobals()
  })

  it('falls back to a download when the picker API is unavailable', async () => {
    const createObjectURL = vi.fn(() => 'blob:fake')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    })
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    const backup = await saveBackupToFile([makeNpc()], [])

    expect(backup).not.toBeNull()
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake')
    expect(lastSavedBackup()?.npcs).toHaveLength(1)

    vi.unstubAllGlobals()
  })
})

describe('pickBackupFile', () => {
  it('reads and parses the chosen backup file', async () => {
    const saved = makeBackup([makeNpc()])
    stubOpenPicker(JSON.stringify(saved))

    const backup = await pickBackupFile()

    expect(backup).toEqual(saved)
  })

  it('returns null when the user cancels the picker', async () => {
    pickerWindow.showOpenFilePicker = vi.fn(async () => {
      throw new DOMException('user cancelled', 'AbortError')
    })

    await expect(pickBackupFile()).resolves.toBeNull()
  })

  it('falls back to a file input when automation suppresses the picker', async () => {
    pickerWindow.showOpenFilePicker = vi.fn(async () => {
      throw new DOMException(
        "Failed to execute 'showOpenFilePicker' on 'Window': Intercepted by Page.setInterceptFileChooserDialog().",
        'AbortError',
      )
    })
    const saved = makeBackup([makeNpc()])
    const click = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(function (this: HTMLInputElement) {
        Object.defineProperty(this, 'files', {
          value: [
            new File([JSON.stringify(saved)], 'backup.json', {
              type: 'application/json',
            }),
          ],
        })
        this.onchange?.(new Event('change'))
      })

    await expect(pickBackupFile()).resolves.toEqual(saved)
    expect(click).toHaveBeenCalledOnce()
  })

  it('rejects a file that is not JSON', async () => {
    stubOpenPicker('definitely not json')

    await expect(pickBackupFile()).rejects.toThrow(
      'That file is not valid JSON',
    )
  })

  it('rejects JSON that is not an NPC backup', async () => {
    stubOpenPicker('{"foo": 1}')

    await expect(pickBackupFile()).rejects.toThrow(
      'That file is not an NPC backup',
    )
  })
})

describe('restoreBackup', () => {
  it('replaces the server NPCs with the backup contents and remembers it', async () => {
    const existing = [
      makeNpc({ name: 'Old One' }),
      makeNpc({ name: 'Old Two' }),
    ]
    const saved = makeBackup([makeNpc({ name: 'Restored' })])
    vi.mocked(listNpcs).mockResolvedValue(existing)
    vi.mocked(deleteNpc).mockResolvedValue(undefined)
    vi.mocked(listLocations).mockResolvedValue([])
    vi.mocked(deleteLocation).mockResolvedValue(undefined)
    vi.mocked(createNpc).mockImplementation(async (input) =>
      makeNpc({ ...input, id: crypto.randomUUID() }),
    )

    const result = await restoreBackup(saved)

    expect(deleteNpc).toHaveBeenCalledTimes(2)
    expect(deleteNpc).toHaveBeenCalledWith(existing[0].id)
    expect(deleteNpc).toHaveBeenCalledWith(existing[1].id)
    expect(createNpc).toHaveBeenCalledTimes(1)
    expect(createNpc).toHaveBeenCalledWith(toInput(saved.npcs[0]))
    expect(result).toEqual(saved)
    expect(lastSavedBackup()?.npcs[0].name).toBe('Restored')
  })

  it('recreates locations and remaps each npc location id', async () => {
    const oldLocation = makeLocation({ id: 'old-loc', name: 'Riverside' })
    const npc = makeNpc({ name: 'Linked', locationId: 'old-loc' })
    const saved = makeBackup([npc], [oldLocation])
    vi.mocked(listNpcs).mockResolvedValue([])
    vi.mocked(deleteNpc).mockResolvedValue(undefined)
    vi.mocked(listLocations).mockResolvedValue([])
    vi.mocked(deleteLocation).mockResolvedValue(undefined)
    vi.mocked(createLocation).mockResolvedValue(
      makeLocation({ id: 'new-loc', name: 'Riverside' }),
    )
    vi.mocked(createNpc).mockImplementation(async (input) =>
      makeNpc({ ...input, id: crypto.randomUUID() }),
    )

    await restoreBackup(saved)

    expect(createLocation).toHaveBeenCalledWith({
      name: 'Riverside',
      notes: null,
    })
    // The npc's old location id is remapped to the freshly created one.
    expect(createNpc).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Linked', locationId: 'new-loc' }),
    )
  })
})

describe('lastSavedBackup', () => {
  it('returns null when nothing has been saved', () => {
    expect(lastSavedBackup()).toBeNull()
  })

  it('returns null for corrupt stored data', () => {
    localStorage.setItem(STORAGE_KEY, 'not json')
    expect(lastSavedBackup()).toBeNull()

    localStorage.setItem(STORAGE_KEY, '{"npcs": "nope"}')
    expect(lastSavedBackup()).toBeNull()
  })

  it('returns the stored snapshot', () => {
    const backup = makeBackup([makeNpc()])
    localStorage.setItem(STORAGE_KEY, JSON.stringify(backup))
    expect(lastSavedBackup()).toEqual(backup)
  })
})
