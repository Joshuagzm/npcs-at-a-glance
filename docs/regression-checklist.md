# Manual regression checklist

A quick click-through to confirm nothing obvious broke after a change. Run the
whole list before a release; for a targeted change, run the affected section
plus **Smoke**.

**Prerequisites**

- Backend running on `:5000` (`dotnet run --project NpcManagement.Api --launch-profile http`)
- Frontend running on `:5173` (`yarn dev` from `frontend/`)
- For portrait generation: Stable Diffusion Forge running on `:7860` with `--api`
- Postgres reachable (NPCs and locations persist there)

---

## Smoke (always run)

- [ ] App loads at `http://localhost:5173` with no console errors
- [ ] Home page shows three tiles: NPC Management, Location Management, Settings (disabled)
- [ ] Brand title "NPC Management" and the Home link both navigate to `/`
- [ ] Nav links to NPCs and Locations work; active link is highlighted
- [ ] Dark/light mode toggle switches theme and persists across reload

## NPCs list (`/npcs`)

- [ ] List loads and shows existing NPCs in a table
- [ ] Empty state ("No NPCs yet") shows when there are none
- [ ] Backend-down state shows the "Is the backend running on port 5000?" error
- [ ] "Filter by location" narrows the list; "No location" and "All locations" both work
- [ ] Clicking a row opens the edit dialog
- [ ] Per-row Edit button opens the dialog; Delete button prompts and removes (row click is suppressed on the actions cell)
- [ ] Columns render: name+notes, role, location name, level, disposition badge, personality (likes/dislikes/goals), stat block summary

## NPC form dialog — **focus area after the panel refactor**

Open via "Add NPC" and via editing an existing NPC.

### Core fields
- [ ] Name (required), Role, Location select, Level (clamped 1–20)
- [ ] Likes / Dislikes / Goals: add via Enter or the + button, remove via the × button
- [ ] Notes textarea
- [ ] "Hostile toward players" checkbox
- [ ] Race select + "Random name" fills the Name field with a race-appropriate name
- [ ] Submit creates (Add) or updates (Edit); dialog closes on success; list refreshes
- [ ] Validation/submit error renders below the form; Cancel closes without saving

### HitPointsField (extracted)
- [ ] Current and Max HP accept numbers; blank is allowed
- [ ] On blur, Current is clipped down to Max when it exceeds Max
- [ ] Typing a larger Max does not momentarily drag Current down

### PortraitPanel (extracted)
- [ ] Gender / Age selects (incl. "Unspecified"), Skin color, Additional details edit correctly
- [ ] "Generate portrait" shows the spinner + "this can take up to a couple of minutes" placeholder while pending
- [ ] Generated portrait renders; seed line ("Seed N · reused on regenerate") appears
- [ ] "Regenerate" dims the existing portrait and overlays a spinner; reuses the locked seed
- [ ] "Remove" clears the portrait
- [ ] Portrait error (e.g. Forge down) renders the error message
- [ ] Saving persists the portrait + appearance fields; reopening the NPC shows them

### StatBlockPicker (extracted)
- [ ] Monster search by Enter and by the Search button
- [ ] "Searching…", no-results, and error states render
- [ ] Selecting a monster shows the stat-block card (AC/HP/speed, ability scores, traits, actions)
- [ ] **Cross-panel:** selecting a monster seeds Current/Max HP only when they were blank
- [ ] "Remove" on the card returns to the search view
- [ ] Saving persists the stat block; reopening shows it; list "Stat block" column shows name + CR/AC/HP

## Locations (`/locations`)

- [ ] List loads; empty state shows when there are none
- [ ] Add / Edit / Delete (with confirm) work
- [ ] NPC count per location is correct
- [ ] Editing a location lists its NPCs; clicking one opens the side detail panel; close (×) works
- [ ] Creating an NPC with a location, then opening that location, shows the NPC

## Backup (Save/Load — on both NPCs and Locations pages)

- [ ] "Save backup" downloads/saves a JSON file containing both NPCs and locations
- [ ] "Load backup" prompts to confirm, then replaces current data with the file's contents
- [ ] After restore, NPC↔location links are preserved (NPCs land in the right locations)
- [ ] "Last saved …" tooltip on the Load button reflects the last save
- [ ] Loading a non-JSON / non-backup file surfaces a clear error

## Cross-cutting

- [ ] No console errors/warnings during the above
- [ ] `yarn lint`, `yarn test`, and `npx tsc -b` all pass (run from `frontend/`)
