# 008 — Entity Codes (Specification)

> Spec status: ready for implementation. Decision trail: [`008-entity-codes-brainstorming.md`](./008-entity-codes-brainstorming.md).

## 1. Overview

Add a `code` column to each of eight entities: `Value`, `ValueInstance`, `Taxonomy`, `Channel`, `ValueStream`, `AgreementTemplate`, `Pipeline`, `Archetype`. The code is a stable, human-readable, snake_case identifier — required at creation, unique within each entity's own table, and **immutable** thereafter. It complements the UUID `id` (machine-stable, opaque) and the `name` (display-friendly, editable, non-unique) with a third axis: a stable string callers can paste into seed files, scripts, URLs of future tooling, and external integrations.

```
   ┌────────────────┐         ┌─────────────────┐         ┌────────────────────────┐
   │  id (uuid)     │  +      │  name           │   +     │  code (varchar(64))    │
   │  opaque, PK    │         │  display-only,  │         │  snake_case, UNIQUE,   │
   │  always stable │         │  mutable        │         │  required, IMMUTABLE   │
   └────────────────┘         └─────────────────┘         └────────────────────────┘
```

The change ships in one PR: a single migration adds the column + `UNIQUE` constraint + backfills existing rows + updates `search_vector` triggers where applicable; each entity's DTO / service / controller / BDD tests follow; seed data is updated; UI gets a `Code` column, a copy-to-clipboard badge on detail pages, and an auto-fill affordance in create forms.

## 2. Domain rules

### 2.1 Code contract (applies to every entity)

| Rule              | Value                                                                                  |
|-------------------|----------------------------------------------------------------------------------------|
| Column type       | `varchar(64) NOT NULL`                                                                 |
| Pattern           | `^[a-z][a-z0-9_]*$` (must start with lowercase letter, then letters/digits/underscores) |
| Length            | 2–64 characters                                                                        |
| Uniqueness        | One `UNIQUE` constraint per table, named `UQ_<table>_code`                             |
| Mutability        | Set on `POST` only. `PATCH` payloads MUST NOT include `code`; if present the API rejects with 400 |
| Normalisation     | None — payloads with whitespace / uppercase / hyphens are rejected with 400 (Zod)      |
| Reserved values   | None (v1)                                                                              |

Conflict handling: the service layer wraps each create with `try/catch`; on Postgres error code `23505` against `UQ_<table>_code`, throw `ConflictException` with message `<Entity> with this code already exists` (matches `GeographiesService:82` pattern).

### 2.2 Slugify helper (`@marketlum/shared`)

A pure function used by the web UI (create-form auto-fill) and the seeders (deriving codes from canonical names where convenient). Lives in `packages/shared/src/helpers/code.ts`:

```ts
// Returns a snake_case suggestion or '' if the input cannot be reduced to a valid code.
export function suggestCode(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return /^[a-z][a-z0-9_]*$/.test(slug) ? slug.slice(0, 64) : '';
}
```

No Unicode transliteration, no collision resolution — clients handle 409 on submit.

### 2.3 Zod schemas (`@marketlum/shared`)

A reusable `codeSchema` plus per-entity schema additions:

```ts
// packages/shared/src/schemas/code.schema.ts (new)
export const codeSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, {
    message: 'must be snake_case: lowercase letters, digits, underscores; starts with a letter',
  });
```

Each existing `create*Schema` extends with `code: codeSchema`. Each `update*Schema` MUST NOT include `code`; if any client sends one, Zod's strict-object passthrough rejects it (where current schemas already use `.strict()`) or the service layer strips and ignores it (where they don't — see §3.2). Each `*ResponseSchema` gains `code: z.string()`.

## 3. API surface

### 3.1 New endpoint per entity

```
GET /values/by-code/:code            → ValueResponse | 404
GET /value-instances/by-code/:code   → ValueInstanceResponse | 404
GET /taxonomies/by-code/:code        → TaxonomyResponse | 404
GET /channels/by-code/:code          → ChannelResponse | 404
GET /value-streams/by-code/:code     → ValueStreamResponse | 404
GET /agreement-templates/by-code/:code → AgreementTemplateResponse | 404
GET /pipelines/by-code/:code         → PipelineResponse | 404
GET /archetypes/by-code/:code        → ArchetypeResponse | 404
```

Path-param validation: the same `^[a-z][a-z0-9_]*$` Zod schema is applied via a request-param pipe to short-circuit garbage codes with a 400 before the DB lookup.

All eight endpoints sit on the existing controllers, protected by the existing `AdminGuard` already applied at the controller class level (`packages/core/src/auth/guards/admin.guard.ts`).

### 3.2 Existing endpoints — payload changes

For each entity:

- `POST /<entity>` — request body **adds** required `code`. Response includes `code`.
- `PATCH /<entity>/:id` — `code` is omitted from the input schema. If a request body includes `code`, validation rejects with 400 (`Unrecognized key`) — verified by BDD scenario.
- `GET /<entity>` (list) — every returned row includes `code`.
- `GET /<entity>/:id` — returned object includes `code`.

Nested references are widened too: e.g. `ValueInstanceResponse.value` already returns `{ id, name, … }`; it now returns `{ id, name, code, … }`. Same for `Agreement.template`, `Pipeline.valueStream`, `Value.parent`, `Value.mainTaxonomy`, `Value.taxonomies[]`, `Archetype.taxonomies[]`, etc. Anywhere the API embeds one of the eight entities, `code` rides along.

### 3.3 Error contracts

| Cause                                       | Status | Body                                                            |
|---------------------------------------------|--------|-----------------------------------------------------------------|
| Missing or malformed `code` on `POST`       | 400    | Zod error: `code` field detail                                  |
| Duplicate `code` on `POST`                  | 409    | `{ message: "<Entity> with this code already exists" }`         |
| `code` present in `PATCH` body              | 400    | Zod error: unrecognized key `code`                              |
| Malformed `code` in `by-code` path param    | 400    | Zod error from param pipe                                       |
| Unknown `code` in `by-code` path param      | 404    | `{ message: "<Entity> not found" }`                             |

## 4. Database

### 4.1 Migration `1700000000046-AddEntityCodes.ts`

Single migration covering all eight tables and the five existing search-vector triggers.

For each table (`values`, `value_instances`, `taxonomies`, `channels`, `value_streams`, `agreement_templates`, `pipelines`, `archetypes`):

```sql
-- 1. Add as nullable so the backfill can populate it
ALTER TABLE "<table>" ADD COLUMN "code" varchar(64);

-- 2. Backfill: deterministic, guaranteed-unique, guaranteed-valid snake_case
UPDATE "<table>" SET "code" = '<prefix>_' || substr(id::text, 1, 8);
-- where <prefix> is one of:
--   values             → value
--   value_instances    → value_instance
--   taxonomies         → taxonomy
--   channels           → channel
--   value_streams      → value_stream
--   agreement_templates → agreement_template
--   pipelines          → pipeline
--   archetypes         → archetype

-- 3. Lock it down
ALTER TABLE "<table>" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "<table>" ADD CONSTRAINT "UQ_<table>_code" UNIQUE ("code");
```

`down()` reverses in opposite order per table: `DROP CONSTRAINT UQ_<table>_code`, `DROP COLUMN code`.

UUIDv4 first-8-char collisions within a single table at our scale (< 10⁶ rows per table) are negligible (~1 in 4 billion); the `UNIQUE` constraint is the failsafe — if backfill ever hits a collision the migration aborts and a developer resolves manually.

### 4.2 Search vector triggers (5 of 8 tables)

The following five tables already have `search_vector` columns and update triggers (created in migrations `0012`, `0014`, `0019`, `0020`, `0025`): `values`, `value_instances`, `value_streams`, `channels`, `archetypes`. For each, the migration `CREATE OR REPLACE`s the trigger function to include `code` with weight `D` (below name/title and existing body weights), using the `simple` dictionary so snake_case tokens aren't stemmed:

```sql
-- example for values
CREATE OR REPLACE FUNCTION values_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple',  coalesce(NEW.code, '')), 'D');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;
```

A second backfill statement re-triggers the row update on the five tables so existing rows pick up the new vector:

```sql
UPDATE "values" SET "code" = "code";  -- no-op write to fire the trigger
-- same for value_instances, value_streams, channels, archetypes
```

`down()` restores each trigger function to its pre-change body (verbatim copies stored in the migration file).

The three tables without `search_vector` (`taxonomies`, `agreement_templates`, `pipelines`) are out of scope for search inclusion in this PR (see §13).

### 4.3 Referential integrity

No FK changes. Code is a string column, never used as a join key in the schema. Cross-entity references continue to use `id` (uuid).

## 5. Permissions

No changes. All eight controllers already extend `AdminGuard` at the class level via `@UseGuards(JwtAuthGuard, AdminGuard)`. The new `GET /<entity>/by-code/:code` endpoints inherit it.

## 6. Backend module layout

Per-entity changes (eight near-identical sets):

```
packages/core/src/<entity>/
  <entity>.entity.ts        # + @Column({ type: 'varchar', length: 64, unique: true }) code: string;
  <entity>.dto.ts           # request/response DTOs (already Zod-driven) — no source change if DTOs derive from shared schemas
  <entity>.service.ts       # + findByCode(code): Promise<Entity>; create() wraps with try/catch on 23505
  <entity>.controller.ts    # + @Get('by-code/:code') with param-validation pipe
```

Shared additions:

```
packages/shared/src/
  helpers/code.ts                       # suggestCode()
  schemas/code.schema.ts                # codeSchema
  schemas/<entity>.schema.ts            # extends create*Schema with code, response with code; widens nested refs
  index.ts                              # re-exports
```

UI additions:

```
packages/ui/src/
  components/code-badge.tsx             # monospace badge with click-to-copy (shadcn Button variant=ghost size=sm)
  hooks/use-code-from-name.ts           # binds name→code in forms; stops syncing on first manual edit
  pages/admin/<entity>-page.tsx         # adds Code column to TanStack Table
  pages/admin/<entity>-detail-page.tsx  # CodeBadge next to title
  forms/<entity>-form.tsx               # name field bound to useCodeFromName(); code field always editable
```

Web app wiring is via the existing re-exports under `apps/web/src/app/admin/<entity>/[id]/page.tsx`, etc.; no new route files are needed.

## 7. UI / UX

### 7.1 List pages

Each of the eight list pages adds a `Code` column immediately after `Name`, rendered with `font-mono text-xs text-muted-foreground`. Column is sortable (alphabetical) and matches the existing column-toggle behaviour if a page has one.

```
┌──────────────────────────┬──────────────────────────┬──────────────────────┬──────────┐
│ Name                     │ Code                     │ …other columns…      │ Actions  │
├──────────────────────────┼──────────────────────────┼──────────────────────┼──────────┤
│ Marketing Email Outbound │ marketing_email_outbound │ …                    │ ⋯        │
│ Customer Onboarding      │ customer_onboarding      │ …                    │ ⋯        │
└──────────────────────────┴──────────────────────────┴──────────────────────┴──────────┘
```

### 7.2 Create form

```
┌─ New Value ──────────────────────────────────────────────────┐
│  Name                                                        │
│  [ Marketing Email Outbound                              ]   │
│                                                              │
│  Code                                                        │
│  [ marketing_email_outbound                              ]   │
│   ↑ auto-fills from Name; once you edit this field,          │
│     auto-sync stops. Use lowercase letters, digits, _.       │
│                                                              │
│  …other fields…                                              │
│                                                              │
│  [ Cancel ]                                  [ Create ]      │
└──────────────────────────────────────────────────────────────┘
```

Behaviour (encapsulated in `useCodeFromName`):

1. Initial state: `code === ''`, `synced === true`.
2. On every Name keystroke while `synced === true`: `code := suggestCode(name)`.
3. On the first Code keystroke (user edits Code manually): `synced := false`. Auto-fill stops permanently for the form session.
4. Submit goes through Zod client-side validation; server-side 400 / 409 errors are surfaced inline next to the Code field.

### 7.3 Detail page

```
┌─────────────────────────────────────────────────────────────────┐
│  Marketing Email Outbound    [ marketing_email_outbound 📋 ]    │  ← CodeBadge
│  ─────────────────────────────────────────────────────────────  │
│  …rest of detail body unchanged…                                │
└─────────────────────────────────────────────────────────────────┘
```

`CodeBadge` is a single reusable component (`packages/ui/src/components/code-badge.tsx`) used on all eight detail pages. Clicking the badge copies the raw code to the clipboard and shows a toast (`Copied to clipboard`). No keyboard shortcut; no editing — the field is immutable.

### 7.4 URLs

No change. `/admin/<entity>/[id]` remains UUID-based across all eight admin areas.

### 7.5 Global search

The five tables with `search_vector` get codes folded into the existing index (weight `D`) — codes show up alongside names in `/admin/search` results without any UI change. Search-result row rendering MAY include the code as secondary text once the response shape (§3.2) carries it, but this is a polish item, not blocking.

## 8. Shared package additions

| File                                             | Purpose                                                                |
|--------------------------------------------------|------------------------------------------------------------------------|
| `packages/shared/src/schemas/code.schema.ts`     | `codeSchema` reusable across entity schemas                            |
| `packages/shared/src/helpers/code.ts`            | `suggestCode(input: string): string`                                   |
| `packages/shared/src/index.ts`                   | Re-export both                                                         |
| `packages/shared/src/schemas/<entity>.schema.ts` | Add `code: codeSchema` to create input, `code: z.string()` to response, widen nested refs to include code |

`pnpm --filter @marketlum/shared build` must run before any API/UI consumer can see the new exports (already noted in MEMORY.md gotchas).

## 9. UI package additions

| File                                             | Purpose                                                                |
|--------------------------------------------------|------------------------------------------------------------------------|
| `packages/ui/src/components/code-badge.tsx`      | Monospace badge + click-to-copy (uses existing `sonner` toast)         |
| `packages/ui/src/hooks/use-code-from-name.ts`    | Form helper hook                                                       |

Both are surfaced through the existing barrel exports.

## 10. Web app wiring & template sync

Per `CLAUDE.md`'s "Template Synchronization" rule, any change to `apps/api/` or `apps/web/` requires mirroring under `packages/create-marketlum-app/template/`. This PR touches:

- `apps/api/src/app.module.ts` — none expected (modules don't change shape; the new endpoints are inside existing modules).
- `apps/web/src/app/admin/<entity>/page.tsx`, `apps/web/src/app/admin/<entity>/[id]/page.tsx` — none expected (they re-export from `@marketlum/ui`).

The migration file at `packages/core/src/migrations/1700000000046-AddEntityCodes.ts` must be mirrored to `packages/create-marketlum-app/template/packages/core/src/migrations/` if the template tracks migrations there. Same for shared-package schemas and helpers. Each affected file path needs its template twin updated in the same PR.

## 11. Seed data

Each of these seeders gets hand-curated, descriptive codes (target: codes are themselves a tutorial in what the entity represents). Located under `packages/core/src/commands/seeders/`:

| Seeder                       | Sample codes                                                              |
|------------------------------|---------------------------------------------------------------------------|
| `value.seeder.ts`            | `revenue_subscription`, `cogs_hosting`, `marketing_spend`, `payroll`      |
| `value-instance.seeder.ts`   | `revenue_subscription_2026_q1`, `cogs_hosting_aws_2026_q1`                |
| `taxonomy.seeder.ts`         | `finance`, `finance_revenue`, `finance_cogs`, `ops`, `ops_infra`          |
| `channel.seeder.ts`          | `email`, `email_transactional`, `email_marketing`, `phone`                |
| `value-stream.seeder.ts`     | `customer_acquisition`, `customer_onboarding`, `customer_retention`       |
| `agreement-template.seeder.ts` | `nda_mutual`, `msa_standard`, `dpa_v1`                                  |
| `pipeline.seeder.ts`         | `sales_inbound`, `sales_outbound`, `support_tier1`                        |
| `archetype.seeder.ts`        | `saas_customer`, `enterprise_customer`, `vendor`                          |

Codes must satisfy the same regex as the API enforces; the seeder code MUST NOT rely on `suggestCode()` to derive them — they are intentional examples (decision: Q4.4).

## 12. BDD coverage

Per Q4.5, new scenarios are appended to each entity's existing `create-*.feature` and `update-*.feature` files under `packages/bdd/features/<entity>/`. Step definitions are added to the existing `apps/api/test/<entity>/<entity>.steps.ts` files.

### 12.1 Per-entity additions (eight entities × the same template)

In `create-<entity>.feature`:

```gherkin
Scenario: Creating a <entity> with a valid snake_case code succeeds
  Given I am authenticated as an admin
  When I POST a <entity> with name "Example" and code "example_one"
  Then the response status is 201
  And the response body contains code "example_one"

Scenario: Creating a <entity> with an invalid code is rejected
  Given I am authenticated as an admin
  When I POST a <entity> with name "Example" and code "Example One"
  Then the response status is 400

Scenario: Creating a <entity> with a duplicate code is rejected
  Given a <entity> with code "dup_code" exists
  And I am authenticated as an admin
  When I POST a <entity> with name "Other" and code "dup_code"
  Then the response status is 409
```

In `update-<entity>.feature`:

```gherkin
Scenario: Updating a <entity> ignores any code in the payload
  Given a <entity> with code "stable_code" exists
  And I am authenticated as an admin
  When I PATCH the <entity> with body { "name": "Renamed", "code": "new_code" }
  Then the response status is 400
  And the <entity>'s code is still "stable_code"
```

In a new `get-by-code-<entity>.feature` (one per entity, since there's no existing place to append):

```gherkin
Feature: Get <entity> by code
  Scenario: Looking up an existing <entity> by code returns it
    Given a <entity> with code "lookup_me" exists
    When I GET /<entity>/by-code/lookup_me
    Then the response status is 200
    And the response body contains code "lookup_me"

  Scenario: Looking up an unknown code returns 404
    When I GET /<entity>/by-code/no_such_thing
    Then the response status is 404

  Scenario: Looking up with a malformed code returns 400
    When I GET /<entity>/by-code/NotValid
    Then the response status is 400
```

### 12.2 Existing scenario updates

Every existing scenario that POSTs one of the eight entities currently omits `code`. Each must be updated to include a unique code, either:

- inline in the Gherkin step text, or
- via a step-definition helper that fills in `suggestCode(name) + '_' + random_suffix` when the scenario doesn't specify a code.

Recommended: helper approach for low Gherkin churn. Implementations live in `apps/api/test/<entity>/<entity>.steps.ts`.

### 12.3 Counts (added scenarios)

- 3 added to each `create-*.feature` × 8 entities = 24
- 1 added to each `update-*.feature` × 8 entities = 8
- 3 added to each new `get-by-code-*.feature` × 8 entities = 24

Total: **~56 new scenarios** across the eight entities. `pnpm test:e2e` should rise from 670 → ~726 once all are wired.

## 13. Out of scope

- **Mutable codes** — Q1.4 made codes immutable. Rename support is explicitly excluded; users recreate rows to change a typo.
- **Parent-scoped uniqueness for tree entities** — Q1.3 picked single global uniqueness per table.
- **URL routing changes** — Q3.5 keeps UUIDs in admin URLs.
- **Unicode transliteration in `suggestCode`** — Q3.3 picked the lossy/ASCII-only path.
- **Server-side suggestion / collision-resolution endpoint** — Q3.3 rejected the network round-trip.
- **Reserved-word denylist** — Q2.5 chose no reservations in v1.
- **Search inclusion for `taxonomies`, `agreement_templates`, `pipelines`** — those tables have no `search_vector` today; adding full-text search infrastructure to them is a separate feature.
- **External-facing public URLs (`/v/[code]`)** — Q3.5 deferred.

## 14. Delivery plan (within the single PR)

Per Q4.6 — bottom-up, verifiable at every checkpoint:

1. **Shared package** — `code.schema.ts`, `helpers/code.ts`, re-exports. Run `pnpm --filter @marketlum/shared build`.
2. **Migration** — `1700000000046-AddEntityCodes.ts`: column adds + backfills + UNIQUE constraints across all 8 tables + tsvector trigger updates on 5. Run `pnpm migration:run` locally and verify column shape.
3. **Entities, one at a time** (`Value` first, then `ValueInstance`, `Taxonomy`, `Channel`, `ValueStream`, `AgreementTemplate`, `Pipeline`, `Archetype`):
   - Add `code` to the TypeORM entity.
   - Update the entity's Zod schemas in `@marketlum/shared` (`create*Schema`, `update*Schema`, `*ResponseSchema`, nested-ref widening). Rebuild shared.
   - Update the service (`findByCode`, `create` 23505 handler).
   - Update the controller (`@Get('by-code/:code')` + param-validation pipe).
   - Append BDD scenarios to `create-*.feature` and `update-*.feature`; add new `get-by-code-*.feature`.
   - Update existing create scenarios to provide `code` (helper-driven).
   - Run `pnpm test:e2e` — must be green before moving to the next entity.
4. **Seeders** — hand-curate codes in each of the eight seeders. Re-run `pnpm seed:sample -- --reset` to verify.
5. **Web UI** — add `CodeBadge`, `useCodeFromName`, then update each `<entity>-page.tsx`, `<entity>-detail-page.tsx`, and `<entity>-form.tsx` in `@marketlum/ui`.
6. **Template sync** — mirror every changed file under `packages/create-marketlum-app/template/` per `CLAUDE.md`.
7. **Final pass** — `pnpm -r build` + `pnpm test:e2e` + manual smoke of one entity per kind (tree, flat, ValueInstance for nested-response check).
