# NPC Management

Full-stack app: React + TypeScript frontend (Vite, yarn) and a .NET 10 Web API backend.

## Frontend (`frontend/`)

- Vite 8 + React 19 + TypeScript
- TanStack Router (file-based routes in `src/routes/`, generated `routeTree.gen.ts`)
- Tailwind CSS v4 + shadcn/ui (components in `src/components/ui/`, add more with `npx shadcn@latest add <name>`)
- ESLint (flat config) + Prettier

```sh
cd frontend
yarn          # install
yarn dev      # dev server on http://localhost:5173, proxies /api -> http://localhost:5000
yarn build    # type-check + production build
yarn lint     # eslint
yarn format   # prettier --write
```

## Backend (`backend/`)

.NET 10 Web API split into the standard layers:

- `NpcManagement.Api` — controllers, request contracts, DI wiring
- `NpcManagement.Domain` — entities and repository interfaces
- `NpcManagement.Infrastructure` — repository implementations (in-memory for now)

```sh
cd backend
dotnet build NpcManagement.slnx
dotnet run --project NpcManagement.Api --launch-profile http   # http://localhost:5000
```

Endpoints: `GET/POST /api/npcs`, `GET/PUT/DELETE /api/npcs/{id}`. Sample requests in `NpcManagement.Api/NpcManagement.Api.http`.

## Development

Run both for full-stack dev: start the backend (`dotnet run`), then `yarn dev` in `frontend/` — the Vite proxy forwards `/api/*` to the backend.
