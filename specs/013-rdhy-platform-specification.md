# 013 — RenDanHeYi Plugin: Platforms (Specification)

> **Status:** Ready for implementation
> **Decision trail:** [013-rdhy-platform-brainstorming.md](./013-rdhy-platform-brainstorming.md) (Q1–Q21, all recommendations accepted)
> **Builds on:** spec 012 (plugin system); first entity-bearing plugin after `@marketlum/plugin-nbp`

## 1. Overview

This spec starts the RenDanHeYi (RDHY) plugin with its first vertical slice: a plugin-owned **`RdhyPlatform`** catalog entity and a **one-platform-per-value-stream** membership relation to core `ValueStream`s. It also creates the `packages/plugin-rdhy` package itself (spec 012's planned "PR 2" was never built) and makes one small extension to the plugin system: **dynamic segments in plugin routes** so plugin pages can follow the core list + detail URL convention.

The spec 012 hard rule holds throughout: **no core entity, schema, migration, or API response changes**. The relationship lives entirely in plugin-owned tables with one-way FKs into core (Q3).

```
        core (untouched)                      plugin_rdhy_* (plugin-owned)
  ┌──────────────────────────┐         ┌──────────────────────────────────────┐
  │ value_streams            │         │ plugin_rdhy_platforms                │
  │  id, code, name, ...     │         │  id, code, name, description, ts     │
  └────────────▲─────────────┘         └───────────────▲──────────────────────┘
               │ ON DELETE CASCADE                     │ ON DELETE CASCADE
               │                                       │
  ┌────────────┴───────────────────────────────────────┴────────────────────┐
  │ plugin_rdhy_platform_value_streams                                      │
  │  id, platformId, valueStreamId UNIQUE, createdAt                        │
  └─────────────────────────────────────────────────────────────────────────┘
```

**Scope (Q1):** platforms + membership only. `MicroEnterprise`, `EmcAgreement`, VAM, leading targets, two-way contracting: later specs.

## 2. Domain model

### 2.1 Entities

| Entity | Table | Columns | Relations |
|---|---|---|---|
| `RdhyPlatform` (Q5) | `plugin_rdhy_platforms` | `id uuid pk`, `code varchar(64) NOT NULL UNIQUE`, `name varchar NOT NULL`, `description text NULL`, `createdAt`, `updatedAt` | — |
| `RdhyPlatformValueStream` | `plugin_rdhy_platform_value_streams` | `id uuid pk`, `platformId uuid NOT NULL`, `valueStreamId uuid NOT NULL UNIQUE`, `createdAt` | `platformId → plugin_rdhy_platforms(id) ON DELETE CASCADE`; `valueStreamId → value_streams(id) ON DELETE CASCADE` (one-way FK to core, imported as `ValueStream` from `@marketlum/core`) |

Semantics:

- **Cardinality (Q2):** the `UNIQUE` on `valueStreamId` enforces at most one platform per value stream; a platform hosts many.
- **Tree (Q4):** assignment is node-local. No inheritance, no root-only restriction, no interaction with the closure table.
- **Deletes (Q7):** both FK cascades are DB-level, so deleting a `ValueStream` through core silently removes its link row — core never learns about the plugin. Deleting a platform detaches its members (no blocking, no archive).
- **`code` (Q13):** immutable after creation; pattern `/^[a-z][a-z0-9_]*$/`, max 64 (spec 008 conventions).

### 2.2 Zod schemas (plugin `/shared` entry, Q13 + Round 4 preamble)

`packages/plugin-rdhy/src/shared/schemas.ts`, exported as `@marketlum/plugin-rdhy/shared`:

```ts
export const rdhyPlatformCodeSchema = z.string().min(1).max(64).regex(/^[a-z][a-z0-9_]*$/);

export const createRdhyPlatformSchema = z.object({
  code: rdhyPlatformCodeSchema,
  name: z.string().min(1).max(255),
  description: z.string().nullish(),
});

export const updateRdhyPlatformSchema = z.object({   // no `code` — immutable
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullish(),
});

export const assignRdhyPlatformSchema = z.object({
  platformId: z.string().uuid(),
});
```

Response shapes (types + response schemas alongside):

```ts
// list item / base
{ id, code, name, description, memberCount: number, createdAt, updatedAt }
// detail = base + members
{ ..., members: Array<{ id, code, name, level }> }   // value-stream summaries
// reverse lookup
{ platform: { id, code, name } | null }
```

Member summaries mirror the summary-object convention of core response schemas (like `lead`/`agent` in `valueStreamResponseSchema`) — id, code, name, level only.

## 3. API surface

All endpoints under the plugin's Nest module, guarded by the existing `AdminGuard`, validated by `ZodValidationPipe`.

| Method & path | Behavior |
|---|---|
| `POST /plugins/rdhy/platforms` | Create. `201` with base shape. `409` on duplicate `code`. `422` on invalid body. |
| `GET /plugins/rdhy/platforms` | All platforms ordered by `name`, each with `memberCount` (count subquery, Q11). No pagination/search. |
| `GET /plugins/rdhy/platforms/:id` | Detail with `members` array (join through link table). `404` unknown id. |
| `PATCH /plugins/rdhy/platforms/:id` | Update `name`/`description`. `404`, `422` as usual. |
| `DELETE /plugins/rdhy/platforms/:id` | `204`. Link rows cascade (members become unassigned). `404` unknown id. |
| `PUT /plugins/rdhy/value-streams/:valueStreamId/platform` | Body `{ platformId }`. Upsert (Q8/Q9): creates the link row or **silently moves** an existing assignment to the new platform. `200` with `{ platform: { id, code, name } }`. `404` if the value stream or platform doesn't exist. |
| `DELETE /plugins/rdhy/value-streams/:valueStreamId/platform` | Detach. `204` — idempotent (also `204` when the VS exists but is unassigned). `404` if the value stream doesn't exist. |
| `GET /plugins/rdhy/value-streams/:valueStreamId/platform` | Reverse lookup (Q10). `200` with `{ platform: {...} }` or `{ platform: null }`. `404` if the value stream doesn't exist. |

Value-stream existence is checked against the core `ValueStream` repository (read-only use of core entities — allowed direction).

### Domain events (Q12)

`RdhyPlatform` is the plugin's only `primaryEntities` member → the core `DomainEventSubscriber` emits:

- `marketlum.plugin.rdhy.rdhy_platform.created`
- `marketlum.plugin.rdhy.rdhy_platform.updated`
- `marketlum.plugin.rdhy.rdhy_platform.deleted`

The link entity is **not** registered (join-table convention). Assignment events can be added when a consumer exists.

## 4. Database / migration

One hand-written migration (Q3, Q7) — `packages/plugin-rdhy/src/migrations/<ts>-CreateRdhyPlatformTables.ts`, exported via the plugin's `migrations` field and picked up automatically by `buildDataSourceOptions` / `pnpm migration:run`:

```sql
CREATE TABLE "plugin_rdhy_platforms" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "code" character varying(64) NOT NULL,
  "name" character varying NOT NULL,
  "description" text,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_plugin_rdhy_platforms_code" UNIQUE ("code")
);

CREATE TABLE "plugin_rdhy_platform_value_streams" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "platformId" uuid NOT NULL,
  "valueStreamId" uuid NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_plugin_rdhy_pvs_value_stream" UNIQUE ("valueStreamId"),
  CONSTRAINT "FK_plugin_rdhy_pvs_platform" FOREIGN KEY ("platformId")
    REFERENCES "plugin_rdhy_platforms"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_plugin_rdhy_pvs_value_stream" FOREIGN KEY ("valueStreamId")
    REFERENCES "value_streams"("id") ON DELETE CASCADE
);

CREATE INDEX "IDX_plugin_rdhy_pvs_platform" ON "plugin_rdhy_platform_value_streams" ("platformId");
```

(Follow the id-default/timestamp idioms of existing core migrations; table names satisfy the `plugin_rdhy_` prefix enforced by `validatePlugins`.)

## 5. Backend package layout

```
packages/plugin-rdhy/
  package.json               # exports: "." (backend), "./shared", "./web", "./web/messages"
  tsconfig.json              # dual-runtime like plugin-nbp (jsx: react-jsx, DOM lib, experimentalDecorators)
  features/
    platforms.feature
    assignments.feature
    seed.feature
  src/
    index.ts                 # rdhyPlugin: MarketlumApiPlugin
    rdhy.module.ts           # Nest module: TypeOrmModule.forFeature([RdhyPlatform, RdhyPlatformValueStream])
    platforms/
      rdhy-platform.entity.ts
      rdhy-platform-value-stream.entity.ts
      platforms.controller.ts        # /plugins/rdhy/platforms CRUD
      assignments.controller.ts      # /plugins/rdhy/value-streams/:id/platform
      platforms.service.ts
    migrations/<ts>-CreateRdhyPlatformTables.ts
    seed/rdhy.seeder.ts
    shared/schemas.ts
    web/                     # see §7 (never imported from ".")
```

```ts
// src/index.ts
export const rdhyPlugin: MarketlumApiPlugin = {
  manifest: { id: 'rdhy', name: 'RenDanHeYi', version: '0.1.0',
              marketlumCoreVersion: '<same range plugin-nbp declares>' },
  module: RdhyModule,
  entities: [RdhyPlatform, RdhyPlatformValueStream],
  migrations: [CreateRdhyPlatformTables<ts>],
  primaryEntities: [RdhyPlatform],          // Q12
  seed: seedRdhy,                           // Q18
};
```

No `settings` contract — RDHY needs no settings panel (spec 012 §5).

## 6. UI package addition: dynamic plugin-route segments (Q14)

`packages/ui/src/plugins/` grows pattern matching. Contract change:

```ts
export interface PluginRoute {
  slug: string;                                  // may contain :param segments, e.g. 'platforms/:id'
  Component: ComponentType<{ params?: Record<string, string> }>;
}
```

Matching rules (in `usePluginRoute` / `PluginRouteRenderer`):

1. Split the incoming catch-all slug and each route slug on `/`.
2. A route matches when segment counts are equal and every segment is either an exact match or a `:param` (captured into `params`).
3. **Exact matches win over pattern matches** — existing single-segment routes (NBP) behave exactly as before; the change is backward compatible.
4. No match → the existing not-found behavior, unchanged.

The `/admin/x/[...slug]` catch-all page already receives the full segment array; it joins and forwards as today. `PluginRouteRenderer` passes the captured `params` to the matched `Component`.

## 7. Web UI

### 7.1 Plugin registration

```ts
// src/web/index.tsx
export const rdhyWebPlugin: MarketlumWebPlugin = {
  id: 'rdhy',
  nav: [{
    slug: 'platforms',
    labelKey: 'plugin.rdhy.nav.platforms',
    icon: Network,                      // any fitting lucide icon
    group: 'rdhy',                      // Q15: NEW group
    groupLabelKey: 'plugin.rdhy.nav.group',   // "RenDanHeYi"
  }],
  routes: [
    { slug: 'platforms',     Component: PlatformsListPage },
    { slug: 'platforms/:id', Component: PlatformDetailPage },
  ],
};
```

Messages module (`./web/messages`, plain data, merged server-side under `plugin.rdhy.*` — mirror the NBP locale set and the RSC split from spec 012: components only via client `Providers`, messages only via `plugin-messages.ts`).

### 7.2 Pages

**List — `/admin/x/platforms`** (Q11)

```
  Platforms                                            [ + New platform ]
  ┌──────────────────┬─────────────────────┬───────────────┬───────────┐
  │ Code             │ Name                │ Value streams │           │
  ├──────────────────┼─────────────────────┼───────────────┼───────────┤
  │ industrial_platf…│ Industrial Platform │ 4             │ [Open]    │
  │ shared_services  │ Shared Services     │ 2             │ [Open]    │
  └──────────────────┴─────────────────────┴───────────────┴───────────┘
```

TanStack table like core lists; "New platform" opens a create form (code, name, description). Rows link to the detail page.

**Detail — `/admin/x/platforms/:id`** (Q16)

```
  ← Platforms
  Industrial Platform  (industrial_platform)              [ Edit ] [ Delete ]
  Description text…

  Member value streams
  ┌───────────────────────┬───────────────────────────────┬───────┬─────────┐
  │ Code                  │ Name                          │ Level │         │
  ├───────────────────────┼───────────────────────────────┼───────┼─────────┤
  │ home_appliances       │ Home Appliances               │ 0     │ [Remove]│
  │ washing_machines      │ Home Appliances / Washing Ma… │ 1     │ [Remove]│
  └───────────────────────┴───────────────────────────────┴───────┴─────────┘
  Add value stream: [ search value streams…            ▾ ]
```

- The add-combobox searches all value streams (via existing core endpoints, e.g. the tree/search), rendering hierarchical labels (`parent / child`).
- If a picked VS is already on another platform, the option shows that platform as a hint (data from this platform's perspective comes from the reverse-lookup or the fetched detail of each candidate — implementation may simply annotate after selection); selecting it performs the silent move (Q9) via the `PUT` endpoint.
- Remove calls the `DELETE` assignment endpoint.
- Edit form covers `name`/`description` only (Q13); Delete confirms and warns that members become unassigned (Q7).

**No VS-side surface** in this slice (Q17).

## 8. App wiring & template sync

- `apps/api/src/plugins.ts`: add `rdhyPlugin` to `plugins`.
- `apps/web/src/plugins.ts`: add `rdhyWebPlugin` to `webPlugins`.
- `apps/web/src/plugin-messages.ts`: add `rdhy: rdhyMessages`.
- Workspace: add `@marketlum/plugin-rdhy` to `apps/api` and `apps/web` dependencies.

**Template sync (Q19, CLAUDE.md rule):** RDHY is **not** registered in `packages/create-marketlum-app/template/` (spec 012's "lean template" decision stands). The wiring files above only change by one array/record entry — their shape is unchanged — so **no template updates are expected**. If implementation does alter the shape of any `apps/api/` or `apps/web/` file (e.g. the catch-all page signature), mirror that structural change in the template.

## 9. Seed data (Q18)

`src/seed/rdhy.seeder.ts`, wired as the plugin's `seed(dataSource)` hook and therefore run by `pnpm seed:sample` (and truncated by `-- --reset` like everything else):

- Upsert two platforms: `industrial_platform` / "Industrial Platform", `shared_services` / "Shared Services" (idempotent by `code`).
- Assign a handful of existing sample value streams (query whatever the core sample seeder created; skip gracefully if none exist), respecting the one-platform-per-VS rule.

## 10. BDD coverage (Q20)

Feature files live **in the plugin** (`packages/plugin-rdhy/features/`), step definitions in `apps/api/test/plugin-rdhy/` (jest-cucumber `loadFeature` + `defineFeature`, shared ref-counted app bootstrapped with the real `plugins` array, `createAuthenticatedUser` for auth).

**`platforms.feature`** (~7)
1. Create a platform (201, response shape)
2. Reject invalid code format (422)
3. Reject duplicate code (409)
4. List platforms ordered by name with member counts
5. Get platform detail with member value-stream summaries
6. Update name/description (and: code absent from update schema)
7. Delete a platform → members become unassigned (link rows gone)

**`assignments.feature`** (~7)
1. Assign a value stream to a platform (PUT, 200)
2. Reassign to another platform — silent move, old link replaced
3. Assignment is idempotent (same platform twice → still one link row)
4. Detach (DELETE 204; second DELETE also 204)
5. Reverse lookup returns platform, and `null` when unassigned
6. 404s: unknown value stream / unknown platform on PUT
7. Deleting a value stream (core endpoint) cascades the link row

**`events.feature` scenarios inside `platforms.feature` or standalone** (~2)
1. Create/update emit `marketlum.plugin.rdhy.rdhy_platform.created|updated`
2. Delete emits `...deleted` (id via `entityId`/`databaseEntity` — known TypeORM `afterRemove` gotcha)

**`seed.feature`** (~1)
1. Seeder populates 2 platforms with assignments, idempotently

≈17 scenarios. UI verified via `tsc` (`pnpm --filter @marketlum/ui build`, `npx tsc --noEmit` in `apps/web`) per project practice. The route-resolver matching (§6) gets unit tests in `packages/ui` alongside the BDD suite.

## 11. Permissions

All plugin endpoints use the existing `AdminGuard` at controller level, identical to core controllers and NBP. No new roles or permission concepts (Round 4 preamble).

## 12. Out of scope

- `MicroEnterprise`, `EmcAgreement`, VAM, leading targets, two-way contracting (Q1) — later specs.
- Many-to-many platform membership (Q2) — the link table survives that change (drop the UNIQUE) if ever needed.
- Core-schema extension by plugins (Q3) — the spec 012 rule stands.
- Platform inheritance down the value-stream tree (Q4) — can be layered on later as a read-time concept.
- Membership metadata (`role`, `assignedBy`) (Q3) and assignment domain events (Q12).
- Pagination/search on the platform list (Q11).
- Bulk assignments endpoint (Q10) and any VS-side platform UI / core UI extension slots (Q17).
- RDHY in the `create-marketlum-app` template (Q19).
- Plugin settings panel (RDHY has none).

## 13. Delivery plan (Q21)

One PR, ordered commits:

1. **`@marketlum/ui`:** dynamic-segment support in the plugin route resolver + unit tests (backward compatible; NBP unaffected).
2. **`packages/plugin-rdhy` backend:** package scaffolding, entities, migration, module/controllers/service, shared schemas, seeder, `rdhyPlugin` export.
3. **Web slice + wiring:** `web/` pages, nav group, messages; register in `apps/api/src/plugins.ts`, `apps/web/src/plugins.ts`, `apps/web/src/plugin-messages.ts`; workspace deps.
4. **BDD:** feature files + step definitions; full suite green (`pnpm test:e2e`), shared package rebuilt first (`pnpm --filter @marketlum/shared build` gotcha applies to the plugin build too).

Strict BDD ordering within commits 2–4: features exist before endpoints are implemented.
