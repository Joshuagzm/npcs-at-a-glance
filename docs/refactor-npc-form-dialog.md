# Refactor: break up `NpcFormDialog` into focused panels

**Branch:** `refactor-npc-form-dialog` (off `main`)
**Commits:** `842a3d9` (refactor), `c2ee76a` (regression checklist)
**Date:** 2026-06-23

## Why

`NpcFormDialog` in `frontend/src/routes/npcs.tsx` had grown to ~600 lines and
owned the portrait UI, the stat-block search/picker, and the HP tracker all
inline — alongside ~20 `useState` hooks, three mutations, and a query. It was
hard to read and risky to edit. This was finding #1 from the frontend
code-quality review.

## What changed

A **pure mechanical extraction** — no behaviour change. Three presentational
panels were pulled out into `frontend/src/components/npc-form/`. Each panel owns
its own local query/mutation; the form *state* stays in `NpcFormDialog`, passed
down as `value` + `onChange` props.

| New file | Responsibility | Owns locally | Talks to parent via |
|---|---|---|---|
| `npc-form/portrait-panel.tsx` | Portrait image + appearance fields (gender, age, skin, details) | `generatePortrait` mutation; the gender/age sentinel constants | value/`onChange` props for each field; `onPortraitChange`/`onPortraitSeedChange` |
| `npc-form/stat-block-picker.tsx` | Monster search + selected stat-block card | `searchMonsters` query, `fetchStatBlock` mutation, search box state | `onSelect(block)`, `onRemove()` |
| `npc-form/hit-points-field.tsx` | Current/Max HP inputs + clip-to-max-on-blur | — | `onCurrentHpChange`, `onMaxHpChange` |

`npcs.tsx` dropped from ~996 to ~625 lines.

### The one coordination point

Selecting a stat block needs to **seed the HP tracker** — behaviour that lived
in the old stat-block mutation's `onSuccess`. Since the picker no longer owns HP
state, it now emits the chosen block via `onSelect`, and the dialog handles the
cross-panel concern:

```tsx
// npcs.tsx — NpcFormDialog
const handleStatBlockSelect = (block: StatBlock) => {
  setStatBlock(block)
  // Seed the HP tracker from the monster unless already tracked.
  setMaxHp((prev) => prev || String(block.hitPoints))
  setCurrentHp((prev) => prev || String(block.hitPoints))
}
```

This is the only place panel behaviour reaches across to another panel's state,
and it preserves the original "seed only when blank" rule.

## What did NOT change

- Form state model (still individual `useState` in the dialog — the reducer/
  hook option was deliberately deferred to keep this low-risk).
- Submit payload, validation, dialog open/close/reset-by-`key` behaviour.
- The NPCs list/table, locations page, and backup flow (untouched files).

## Verification

- `npx tsc -b`, `yarn lint`, `yarn test` (19/19) — all pass.
- Manual regression in the live app (see `docs/regression-checklist.md`),
  focused on the extracted panels:
  - Edit dialog populates every panel from saved data.
  - HP clip-on-blur (999 → max).
  - Stat block remove → search → select → card render.
  - HP seeded from blank on stat-block select; **not** overwritten when already set.
  - Create + delete round-trip; Cancel discards.
  - Locations page smoke; console clean (0 errors / 0 warnings).
- **Not exercised:** live portrait generation (hits Forge, slow) and backup
  save/load file dialogs — both listed in the checklist for manual follow-up.

## Review pointers

- Diff is best read as: new files under `components/npc-form/` (added JSX moved
  verbatim) + the slimmed-down `NpcFormDialog` in `npcs.tsx`.
- Sanity-check the prop wiring in `npcs.tsx` where each `<PortraitPanel>` /
  `<StatBlockPicker>` / `<HitPointsField>` is rendered against each panel's props
  interface.
- Confirm `handleStatBlockSelect` matches the old `statBlockMutation.onSuccess`.

## Possible follow-ups (not done here)

- Collapse the dialog's ~20 `useState` into a `useReducer`/`useNpcForm` hook
  (the deferred half of finding #1).
- Add unit tests for the extracted panels now that they're isolated.
