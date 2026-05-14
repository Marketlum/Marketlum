# 006 — Agent Addresses (Specification)

> Spec status: ready for implementation. Decision trail: [`006-agent-addresses-brainstorming.md`](./006-agent-addresses-brainstorming.md).

## 1. Overview

Each `Agent` may carry zero or more postal `Address` records. An `Address` references a `Geography` row with `type='country'` for its country, with the remaining components (line1, line2, city, region, postalCode, label) stored as free text. One address per agent may be marked primary; the API auto-promotes the most-recently-created address when none is flagged so downstream consumers always have a deterministic "the" address.

```
   ┌──────────┐   1..N    ┌────────────┐   N..1   ┌────────────────────┐
   │  Agent   │──────────▶│  Address   │─────────▶│ Geography          │
   │          │  CASCADE  │            │ RESTRICT │ (type='country')   │
   └──────────┘           └────────────┘          └────────────────────┘
```

CRUD lives under nested routes `…/agents/:agentId/addresses[/:addressId]`. The Geography list endpoint (`GET /geographies`) is extended with `type` and `search` query params so the UI can power a `<CountryCombobox>` without shipping the whole geography tree.

## 2. Domain model

### 2.1 `Address` entity

| Column          | Type                  | Nullable | Notes                                                                          |
|-----------------|-----------------------|----------|--------------------------------------------------------------------------------|
| `id`            | uuid (PK)             | no       | `gen_random_uuid()` default                                                    |
| `agentId`       | uuid                  | no       | FK → `agents.id`, `ON DELETE CASCADE`                                          |
| `countryId`     | uuid                  | no       | FK → `geographies.id`, `ON DELETE RESTRICT`. Service enforces `type='country'` |
| `label`         | varchar(50)           | yes      | Free-text, optional ("HQ", "Warehouse #2")                                     |
| `line1`         | varchar(255)          | no       | Required, trimmed                                                              |
| `line2`         | varchar(255)          | yes      | Optional                                                                       |
| `city`          | varchar(255)          | no       | Required, trimmed                                                              |
| `region`        | varchar(255)          | yes      | Optional ("CA", "Mazowieckie")                                                 |
| `postalCode`    | varchar(20)           | no       | Trimmed; no per-country regex (Q2.4)                                           |
| `isPrimary`     | boolean               | no       | Default `false`                                                                |
| `createdAt`     | timestamptz           | no       | TypeORM `@CreateDateColumn`                                                    |
| `updatedAt`     | timestamptz           | no       | TypeORM `@UpdateDateColumn`                                                    |

Indices:

- `idx_addresses_agentId` on `(agentId)`
- `idx_addresses_countryId` on `(countryId)`
- Partial unique index `idx_addresses_agent_primary` on `(agentId)` `WHERE "isPrimary" = TRUE` — enforces at-most-one-primary per agent at the DB level.

### 2.2 Zod schemas (`packages/shared/src/schemas/address.schema.ts`, new)

```ts
export const createAddressSchema = z.object({
  label: z.string().trim().max(50).optional(),
  line1: z.string().trim().min(1).max(255),
  line2: z.string().trim().max(255).optional(),
  city: z.string().trim().min(1).max(255),
  region: z.string().trim().max(255).optional(),
  postalCode: z.string().trim().min(1).max(20),
  countryId: z.string().uuid(),
  isPrimary: z.boolean().optional().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();

export const addressResponseSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  label: z.string().nullable(),
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string(),
  region: z.string().nullable(),
  postalCode: z.string(),
  country: z.object({
    id: z.string().uuid(),
    name: z.string(),
    code: z.string(),
  }),
  isPrimary: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
export type AddressResponse   = z.infer<typeof addressResponseSchema>;
```

### 2.3 `AgentResponse` extension

`agentResponseSchema` (`packages/shared/src/schemas/agent.schema.ts`) gains:

```ts
addresses: z.array(addressResponseSchema).default([]),
```

Ordering invariant: primary first, then `createdAt` ASC (Q2.6). Enforced in the service layer so clients don't have to re-sort.

### 2.4 Geography list query

`packages/shared/src/schemas/geography.schema.ts` adds:

```ts
export const listGeographiesQuerySchema = z.object({
  type: z.nativeEnum(GeographyType).optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(500),
});
export type ListGeographiesQuery = z.infer<typeof listGeographiesQuerySchema>;
```

## 3. API surface

All endpoints behind `AdminGuard` (Q4.2). All bodies validated with `ZodValidationPipe`.

### 3.1 Addresses (nested, new)

| Method | Path                                      | Body                  | Response                       | Notes                                                                            |
|--------|-------------------------------------------|-----------------------|--------------------------------|----------------------------------------------------------------------------------|
| POST   | `/agents/:agentId/addresses`              | `CreateAddressInput`  | `201 AddressResponse`          | Validates agent exists; validates country exists and `type='country'`; if `isPrimary=true`, clears flag on siblings. |
| GET    | `/agents/:agentId/addresses`              | —                     | `200 AddressResponse[]`        | Sorted: primary first, then `createdAt` ASC.                                     |
| GET    | `/agents/:agentId/addresses/:id`          | —                     | `200 AddressResponse`          | 404 if address belongs to a different agent.                                     |
| PATCH  | `/agents/:agentId/addresses/:id`          | `UpdateAddressInput`  | `200 AddressResponse`          | Same country / primary rules as POST.                                            |
| DELETE | `/agents/:agentId/addresses/:id`          | —                     | `204`                          | If primary was deleted, no auto-flag is written — the read endpoint auto-promotes the most-recent sibling at response time. |

Errors:

- `400 Validation failed` — Zod errors (line1 missing, postalCode too long, etc.)
- `404 Address not found` — bad id or mismatched agent
- `404 Country not found` — unknown `countryId`
- `400 Country must be of type 'country'` — countryId references a non-country Geography row

### 3.2 `GET /agents/:id` (modified)

Adds `addresses` (sorted) to the response payload. No other changes.

### 3.3 `GET /geographies` (new)

```
GET /geographies?type=country&search=pol&limit=500
```

Paginated list (reuses `PaginatedResponse<GeographyResponseDto>`). When `type` is set, only that GeographyType is returned. When `search` is set, name is matched with `ILIKE %q%`. Sorted by name ASC.

## 4. Domain helpers (`@marketlum/shared`)

No new pure helpers required. Sorting and primary-promotion logic live in the backend service since they touch repository data.

## 5. UI / UX

### 5.1 Agent detail page — new Addresses tab

`packages/ui/src/pages/admin/agent-detail-page.tsx` already uses `Tabs` (`details`, `valuesTab`). Add a third trigger:

```
[ Details ]  [ Values ]  [ Addresses (3) ]
```

The count comes from `agent.addresses.length`. The tab content renders an `<AddressesList>` component (below).

### 5.2 New components (`packages/ui/src/components/agents/`)

- `addresses-list.tsx` — receives `addresses: AddressResponse[]`, renders a vertical stack of `<AddressCard>` rows + a `+ Add address` button at the top right. Shows an empty-state card when the list is empty (Q3.6).
- `address-card.tsx` — single card row with primary star, bold label (if any), multi-line body (line1, line2?, postalCode + city + region?, country.name), and a `…` dropdown menu: Edit · Set as primary · Delete. Trash uses `<ConfirmDeleteDialog>`.
- `address-form-sheet.tsx` — right-side Sheet (mirrors invoice form pattern), one address per sheet, opened by Add or Edit actions. Fields per Q2.1; country picker is `<CountryCombobox>`.

```
┌─ Right Sheet ─────────────────────────────┐
│ Add address              [×]               │
│ Label        [ HQ                        ] │
│ Line 1       [ ul. Marszałkowska 1       ] │
│ Line 2       [                           ] │
│ City         [ Warszawa                  ] │
│ Region       [                           ] │
│ Postal code  [ 00-001                    ] │
│ Country      [ Poland ▾ ] (combobox)       │
│ ▢ Mark as primary                          │
│                       [ Cancel ] [ Save ]  │
└────────────────────────────────────────────┘
```

### 5.3 `<CountryCombobox>` (new, `packages/ui/src/components/shared/country-combobox.tsx`)

Search-as-you-type. Internally fetches `GET /geographies?type=country&limit=500` once on mount; filters client-side by name on subsequent keystrokes. Matches the `<ValueCombobox>` API (`value`, `onSelect`, `placeholder`). Selected display: `{country.name} ({country.code})`.

### 5.4 Hooks

- `packages/ui/src/hooks/use-countries.ts` (new) — `{ countries, refresh }`, mirrors `use-agents`. Fetches `/geographies?type=country&limit=500`.

### 5.5 i18n keys (en + pl)

Under `agents.*`:

- `addressesTab` — "Addresses"
- `addAddress` — "Add address"
- `editAddress` — "Edit address"
- `deleteAddress` — "Delete address"
- `setAsPrimary` — "Set as primary"
- `primary` — "Primary"
- `noAddresses` — "No addresses yet"
- `addressCreated` — "Address added"
- `addressUpdated` — "Address updated"
- `addressDeleted` — "Address deleted"
- `failedToCreateAddress` / `failedToUpdateAddress` / `failedToDeleteAddress`

Under `addresses.*` (form labels — new namespace):

- `label`, `line1`, `line2`, `city`, `region`, `postalCode`, `country`, `markPrimary`, `selectCountry`

## 6. Database

### 6.1 Migration `packages/core/src/migrations/1700000000043-AddAgentAddresses.ts`

```sql
CREATE TABLE addresses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "agentId"   uuid NOT NULL REFERENCES agents(id)     ON DELETE CASCADE,
  "countryId" uuid NOT NULL REFERENCES geographies(id) ON DELETE RESTRICT,
  label       varchar(50),
  line1       varchar(255) NOT NULL,
  line2       varchar(255),
  city        varchar(255) NOT NULL,
  region      varchar(255),
  "postalCode" varchar(20) NOT NULL,
  "isPrimary" boolean NOT NULL DEFAULT FALSE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_addresses_agentId   ON addresses("agentId");
CREATE INDEX idx_addresses_countryId ON addresses("countryId");
CREATE UNIQUE INDEX idx_addresses_agent_primary
  ON addresses("agentId") WHERE "isPrimary" = TRUE;
```

Down migration drops indices and table. Hand-written per Q4.6 (avoid TypeORM `migration:generate` drift, per `MEMORY.md`).

### 6.2 Referential integrity recap

- Delete an agent → its addresses cascade-delete.
- Delete (or attempt to delete) a country referenced by any address → blocked with FK error (`23503`). The Geographies controller surfaces this as a `409 Conflict` (existing behaviour for `geographies` already used in production via the closure-table tree gating).

## 7. Permissions

`AdminGuard` is applied at the `AgentsController` class level; the nested address methods inherit it. The Geographies controller already uses `AdminGuard`, so the new `GET /geographies?type=country` route does too.

## 8. Backend module layout

```
packages/core/src/agents/
├── agents.controller.ts          (extended — adds @Get/@Post/@Patch/@Delete on
│                                   /:agentId/addresses[/:id])
├── agents.module.ts              (adds Address entity + Geography repo)
├── agents.service.ts             (extends findOne / findAll to include addresses
│                                   sorted; primary auto-promotion at the API boundary)
├── addresses/                    (new sub-folder)
│   ├── addresses.service.ts      (CRUD with primary semantics + country type guard)
│   ├── address.dto.ts            (createZodDto wrappers)
│   └── entities/address.entity.ts
└── agent.dto.ts                  (extends AgentResponseDto with addresses)
```

`AddressesService` (not a separate controller — methods live on `AgentsController` to keep the URL nested and the module surface tight).

`GeographiesService` gains `findAll(query: ListGeographiesQuery): Promise<PaginatedResponse<Geography>>` and `GeographiesController` adds the matching `@Get()` route.

## 9. Shared package additions

- `packages/shared/src/schemas/address.schema.ts` (new) — schemas above
- `packages/shared/src/schemas/geography.schema.ts` — adds `listGeographiesQuerySchema` + `ListGeographiesQuery`
- `packages/shared/src/schemas/agent.schema.ts` — extends `agentResponseSchema` with `addresses`
- `packages/shared/src/index.ts` — re-exports the new symbols

Rebuild shared (`pnpm --filter @marketlum/shared build`) before API tests reference the new schemas (per `MEMORY.md` gotcha).

## 10. UI package additions

- `packages/ui/src/components/agents/addresses-list.tsx`
- `packages/ui/src/components/agents/address-card.tsx`
- `packages/ui/src/components/agents/address-form-sheet.tsx`
- `packages/ui/src/components/shared/country-combobox.tsx`
- `packages/ui/src/hooks/use-countries.ts`
- `packages/ui/src/pages/admin/agent-detail-page.tsx` — adds 3rd tab `addresses`
- `packages/ui/messages/{en,pl}.json` — adds `agents.address*` + new `addresses` namespace

## 11. Web app wiring

The page entry `apps/web/src/app/admin/agents/[id]/page.tsx` is already a thin re-export of `AgentDetailPage from @marketlum/ui` — no change needed.

**Template sync (per `CLAUDE.md`):** since `apps/web/src/app/admin/agents/[id]/page.tsx` is unchanged in shape, the mirror under `packages/create-marketlum-app/template/web/src/app/admin/agents/[id]/page.tsx` is automatically aligned. Sanity-check the file after install to confirm no drift. **No new web files** are introduced.

## 12. Seed data

`packages/core/src/commands/seeders/agent.seeder.ts` is extended (Q4.3) so that each of the three sample organizations gets 1–2 addresses, individuals + virtual agents get none.

Concretely (after `seedGeographies` runs and we have country ids by code):

| Agent              | Addresses                                                                                |
|--------------------|------------------------------------------------------------------------------------------|
| Acme Corp          | HQ — ul. Marszałkowska 1, 00-001 Warszawa, **PL** (primary); Berlin office — Friedrichstr. 1, 10117 Berlin, **DE** |
| TechNova Solutions | HQ — 350 Mission St, 94105 San Francisco CA, **US** (primary)                            |
| GreenLeaf Partners | HQ — 1 Long Acre, WC2E 9LH London, **GB** (primary); Warehouse — ul. Hutnicza 5, 80-871 Gdańsk, **PL** |

The seeder fetches country geographies by `code` (the existing `geography.seeder.ts` already seeds PL/DE/US/GB).

## 13. BDD coverage (~20 scenarios)

Per Q4.5. Feature files live under `packages/bdd/features/agent-addresses/`; step defs under `apps/api/test/agent-addresses/`. Feature paths in `loadFeature()` calls use the existing `../../../../packages/bdd/features/agent-addresses/...` convention.

| File                                       | Scenarios                                                                                         | # |
|--------------------------------------------|---------------------------------------------------------------------------------------------------|---|
| `create-address.feature`                   | happy path; line1 required; unknown agent → 404; non-country geography → 400                      | 4 |
| `update-address.feature`                   | edit fields; set primary clears sibling flag; unset primary; validation; unknown id → 404         | 4 |
| `delete-address.feature`                   | delete non-primary; delete primary → next-most-recent auto-promotes at GET                        | 2 |
| `list-addresses.feature`                   | empty; single; multiple ordered (primary first, then createdAt ASC)                               | 3 |
| `agent-addresses-embedded.feature`         | `GET /agents/:id` returns embedded addresses sorted with country summary; `GET /agents` excludes them | 2 |
| `cascade-delete-on-agent.feature`          | deleting an agent removes its addresses                                                            | 1 |
| **subtotal**                               |                                                                                                    | **16** |
| `list-geographies-filter.feature` (under `geographies/`, new) | filter by `type=country`; search by name `ILIKE`                                | 2 |
| `delete-country-with-address.feature` (under `geographies/`, new) | deleting a country referenced by an address is blocked with 409                  | 1 |
| **total**                                  |                                                                                                    | **19** |

After this PR, `pnpm test:e2e` count in `MEMORY.md` moves from 670 → 689.

## 14. Out of scope

- **Address kind enum.** Q2.2 picked free-text labels only.
- **city/region as Geography refs.** Q2.3 kept them free text.
- **Country-specific postal-code regex.** Q2.4 rejected per-country validation.
- **Drag-reordering of addresses.** Q2.6 rejected explicit `sortOrder`.
- **Addresses column on the agents list page.** Q3.5 (your override) — list stays clean.
- **Filtering agents by country.** Q4.4 — deferred.
- **Recipient name / phone on Address.** Q2.1.
- **Shared `Address` entity for non-agent owners (sites, customers).** Q1.1.

## 15. Delivery plan (single PR per Q4.7)

Order of work inside the PR:

1. **Shared schemas** — `address.schema.ts`, `geography.schema.ts` extension, `agent.schema.ts` extension. `pnpm --filter @marketlum/shared build`.
2. **Migration** — `1700000000043-AddAgentAddresses.ts`. Run locally; verify `\d addresses` in psql.
3. **Entity + Address service** — `addresses/entities/address.entity.ts`, `addresses/addresses.service.ts` (with country-type guard + primary-flag semantics + sorted reads).
4. **Agents service / controller** — extend `findOne`/`findAll` to include sorted addresses; mount nested `@Post/@Get/@Patch/@Delete` on `:agentId/addresses[/:id]`.
5. **Geographies endpoint** — extend `findAll` with `type`/`search`/pagination + Swagger annotations.
6. **BDD step defs** — write step defs alongside features under `apps/api/test/agent-addresses/`; run `pnpm test:e2e` and watch the count climb to 689.
7. **Seed update** — extend `agent.seeder.ts` per §12. `pnpm seed:sample -- --reset` to verify.
8. **UI** — `country-combobox.tsx`, `use-countries.ts`, then `address-card.tsx`, `addresses-list.tsx`, `address-form-sheet.tsx`, finally the new Addresses tab on `agent-detail-page.tsx`. Add i18n keys to `en.json` + `pl.json`. `tsc --noEmit` on `packages/ui` and `apps/web`.
9. **Template sync sanity-check** — diff `packages/create-marketlum-app/template/web/src/app/admin/agents/[id]/page.tsx` against `apps/web/...`; should match (both are one-line re-exports).
10. **Manual smoke** — `pnpm dev`; create an agent, add two addresses (different countries), mark one primary, delete the primary, confirm the other is auto-promoted at the GET endpoint, delete the agent and confirm cascade.
