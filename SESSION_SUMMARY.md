# Session Summary — 10 June 2026

Initial project setup session, taking the repo from an empty directory to a working full-stack scaffold. All work done with Claude Code.

## What was built

### Frontend (`frontend/`)

- Scaffolded with `yarn create vite` (react-ts template): Vite 8, React 19, TypeScript 6.
- **TanStack Router** with file-based routing — `@tanstack/router-plugin` in `vite.config.ts` generates `src/routeTree.gen.ts` from files in `src/routes/`. Created `__root.tsx` (layout with nav) and `index.tsx` (home page); removed the template's `App.tsx`/`App.css`.
- **Tailwind CSS v4** via `@tailwindcss/vite` (no `tailwind.config` file).
- **shadcn/ui** initialised (radix base, Nova preset, Geist font) with `button`, `card`, and `input` components in `src/components/ui/`.
- **Linting**: template ESLint flat config extended with `eslint-config-prettier`; Prettier added with `format`/`format:check` scripts.
- `@` → `src/` import alias in Vite and both tsconfigs; dev-server proxy of `/api/*` → `http://localhost:5000`.
- Verified: `yarn build` and `yarn lint` pass clean.

### Backend (`backend/`)

- .NET 10 SDK (10.0.301) installed via winget during the session (machine had only 8 and 9).
- Solution `NpcManagement.slnx` with three projects, dependencies pointing inward (`Api → Infrastructure → Domain`):
  - `NpcManagement.Domain` — `Npc` entity, `INpcRepository` interface
  - `NpcManagement.Infrastructure` — `InMemoryNpcRepository` (ConcurrentDictionary; data resets on restart)
  - `NpcManagement.Api` — `NpcsController` (CRUD at `/api/npcs`), validated request records in `Contracts/`, DI in `Program.cs`, `http` profile pinned to port 5000
- Verified: build clean (0 warnings), then live smoke test — POST/GET/DELETE round-trip against the running API.

### Tooling & docs

- Git repo initialised; `.claude/settings.local.json` gitignored.
- READMEs: root (overview, running, linting, shadcn, API), `frontend/`, `backend/`.
- `CLAUDE.md` for future Claude Code sessions.
- `.mcp.json` with project-scoped Playwright and Chrome DevTools MCP servers (`cmd /c npx` wrappers for Windows; pending one-time approval in the Claude Code UI).

## Issues hit and how they were resolved

| Issue | Resolution |
| --- | --- |
| shadcn v4 CLI hung on an interactive preset prompt despite `-y` | Pass the preset explicitly: `npx shadcn@latest init -y -b radix --preset nova --no-monorepo` |
| TypeScript 6 deprecates `baseUrl` (TS5101 build error) | Removed `baseUrl`; `paths` works standalone — don't re-add it |
| `tsc` ran before Vite could generate `routeTree.gen.ts` | One `npx vite build` generates it; the file is committed thereafter |
| `react-refresh/only-export-components` errors in shadcn + route files | Rule disabled for `src/components/ui/**` and `src/routes/**` (deliberate — see CLAUDE.md) |
| `dotnet new sln` produced `.slnx`, not `.sln` | New .NET 10 default XML solution format — build with `dotnet build NpcManagement.slnx` |

## State at end of session

- Branch `master`, no remote configured.
- No tests yet in either half.
- Storage is in-memory only; swapping to a real database means implementing `INpcRepository` in `Infrastructure` and changing one registration in `Program.cs`.
- Frontend home page is a placeholder — no UI talks to the API yet.

## Natural next steps

1. Build an NPC list/create/edit UI against `/api/npcs` (TanStack Query would pair well with the router).
2. Add tests: Vitest + React Testing Library on the frontend, xUnit on the backend.
3. Add a GitHub remote and CI (lint + build + test on both halves).
