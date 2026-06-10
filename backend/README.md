# NPC Management — Backend

.NET 10 Web API serving the NPC CRUD endpoints. See the [root README](../README.md) for the full-stack picture; this covers the backend half.

## Layout

```
NpcManagement.slnx               # solution (new .NET 10 XML format)
NpcManagement.Api/               # HTTP layer
  Controllers/NpcsController.cs  #   CRUD endpoints at /api/npcs
  Contracts/NpcRequests.cs       #   request records + validation attributes
  Program.cs                     #   pipeline + DI registrations
  Properties/launchSettings.json #   http profile pinned to port 5000
  NpcManagement.Api.http         #   runnable sample requests
NpcManagement.Domain/            # core — no project references
  Entities/Npc.cs
  Repositories/INpcRepository.cs
NpcManagement.Infrastructure/    # implementations — references Domain
  Repositories/InMemoryNpcRepository.cs
```

Dependencies point inward (`Api → Infrastructure → Domain`). `Domain` defines *what* the app stores and the repository contracts; `Infrastructure` decides *how* it's stored; `Api` only talks to the `INpcRepository` interface.

## Commands

```sh
dotnet build NpcManagement.slnx                                  # build everything
dotnet run --project NpcManagement.Api --launch-profile http     # run on http://localhost:5000
```

Port 5000 matters: the frontend dev server proxies `/api/*` there. The `https` profile (port 7219) also exists if you need TLS locally.

## Endpoints

| Method | Route | Returns |
| --- | --- | --- |
| GET | `/api/npcs` | `200` list of NPCs |
| GET | `/api/npcs/{id}` | `200` NPC, `404` if unknown |
| POST | `/api/npcs` | `201` + Location header; `400` on validation failure |
| PUT | `/api/npcs/{id}` | `200` updated NPC, `404` if unknown |
| DELETE | `/api/npcs/{id}` | `204`, `404` if unknown |

Validation: `name` and `role` are required, `level` must be 1–100 (see `Contracts/NpcRequests.cs`). In development an OpenAPI document is served at `/openapi/v1.json`, and `NpcManagement.Api.http` has ready-made requests (VS Code REST Client, Rider, or Visual Studio can run them).

## Storage

`InMemoryNpcRepository` keeps NPCs in a `ConcurrentDictionary` — **data resets on every restart**. It's registered as a singleton in `Program.cs`:

```csharp
builder.Services.AddSingleton<INpcRepository, InMemoryNpcRepository>();
```

To move to a real database, implement `INpcRepository` in `Infrastructure` (e.g. EF Core + a `DbContext`) and swap that one registration; nothing in `Api` or `Domain` needs to change.

## Adding a new resource

Mirror the NPC slice:

1. `Domain/Entities/Thing.cs`
2. `Domain/Repositories/IThingRepository.cs`
3. `Infrastructure/Repositories/InMemoryThingRepository.cs`
4. `Api/Contracts/ThingRequests.cs`
5. `Api/Controllers/ThingsController.cs`
6. Register the repository in `Api/Program.cs`
