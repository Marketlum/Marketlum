# 014 — RDHY Plugin: VAM Agreements (Specification)

> **Status:** Ready for implementation
> **Decision trail:** [014-rdhy-vam-agreements-brainstorming.md](./014-rdhy-vam-agreements-brainstorming.md) (Q1–Q24; Q2 and Q4 overridden by the user, Q23's platform FK resolved to RESTRICT)
> **Source:** Chaordian's VAM Canvas (CC BY-SA 4.0), sections mapped 1:1
> **Builds on:** spec 013 (`RdhyPlatform`, plugin routes with `:param` segments, RDHY seed hook)

## 1. Overview

A **VAM agreement** is a plugin-owned document modeling one VAM canvas: a value co-creation plan for a value stream (the micro-enterprise stand-in, Q1) over a time horizon, sponsored by an `RdhyPlatform` (Q5). Slice one is **plan-only** (Q2): authoring, lifecycle, rendering — no achievement tracking (spec 015) and no reward computation.

```
 RdhyVamAgreement ──────────────────────────────────────────────────────────
 │  valueStreamId → value_streams (CASCADE)      platformId → plugin_rdhy_
 │  agreementId? → agreements (SET NULL)           platforms (RESTRICT)
 │  currencyId? → values (SET NULL)
 │  horizonMonths, status, startedAt/endedAt, termination citation
 │
 ├── RdhyVamMilestone (offsetMonths)          ── the canvas timing rows
 │     └── RdhyVamItem (track, description,   ── the grid cells
 │           amount?)
 ├── RdhyVamCostEntry (category, label,       ── OPERATING COSTS
 │     amount, headcount?)
 ├── RdhyVamInvestmentEntry (kind, label?,    ── INVESTMENTS
 │     amount)
 └── RdhyVamTerminationCondition (position,   ── TERMINATION CONDITIONS
       text)
```

All tables prefixed `plugin_rdhy_vam_`; core is never modified. No `@marketlum/ui` or core changes are needed — the dynamic-route resolver from spec 013 already supports `vam-agreements/:id`.

## 2. Domain model

### 2.1 Entities

| Entity | Table | Columns | FKs / constraints |
|---|---|---|---|
| `RdhyVamAgreement` | `plugin_rdhy_vam_agreements` | `id uuid pk`, `title varchar NOT NULL`, `horizonMonths int NOT NULL`, `status varchar NOT NULL DEFAULT 'DRAFT'`, `startedAt timestamp NULL`, `endedAt timestamp NULL`, `terminationNote text NULL`, `citedTerminationConditionId uuid NULL`, `createdAt`, `updatedAt` | `valueStreamId → value_streams ON DELETE CASCADE` (Q23); `platformId → plugin_rdhy_platforms ON DELETE RESTRICT` (Q23 resolution); `agreementId uuid NULL → agreements ON DELETE SET NULL` (Q4); `currencyId uuid NULL → values ON DELETE SET NULL` (Q13) |
| `RdhyVamMilestone` | `plugin_rdhy_vam_milestones` | `id`, `agreementId`, `offsetMonths int NOT NULL`, `label varchar NULL`, `position int NOT NULL` | `agreementId → …vam_agreements ON DELETE CASCADE`; `UNIQUE(agreementId, offsetMonths)` (Q8) |
| `RdhyVamItem` | `plugin_rdhy_vam_items` | `id`, `milestoneId`, `track varchar NOT NULL`, `description text NOT NULL`, `amount decimal(14,4) NULL`, `position int NOT NULL` | `milestoneId → …vam_milestones ON DELETE CASCADE` (Q9, Q10) |
| `RdhyVamCostEntry` | `plugin_rdhy_vam_cost_entries` | `id`, `agreementId`, `category varchar NOT NULL`, `label varchar NOT NULL`, `amount decimal(14,4) NOT NULL`, `headcount int NULL`, `position int NOT NULL` | `agreementId → … ON DELETE CASCADE` (Q11) |
| `RdhyVamInvestmentEntry` | `plugin_rdhy_vam_investment_entries` | `id`, `agreementId`, `kind varchar NOT NULL`, `label varchar NULL`, `amount decimal(14,4) NOT NULL`, `position int NOT NULL` | `agreementId → … ON DELETE CASCADE` (Q12) |
| `RdhyVamTerminationCondition` | `plugin_rdhy_vam_termination_conditions` | `id`, `agreementId`, `position int NOT NULL`, `text text NOT NULL` | `agreementId → … ON DELETE CASCADE` (Q7) |

Enum-like columns are **varchar validated by Zod**, not Postgres enums — avoids the known `migration:generate` enum-drift artifacts and keeps the hand-written migration simple. Value sets:

- `status`: `DRAFT | ACTIVE | COMPLETED | TERMINATED` (Q6)
- `track`: `DIRECT_VALUE | INDIRECT_VALUE | VARIABLE_PAY | PROFIT_SHARING | EQUITY` (Q10)
- `category`: `SHARED_SERVICE_PLATFORMS | NODE_MICRO_ENTERPRISES | EXTERNAL_NODES | EMC_PARTICIPATION | LEADERS_SALARY | TEAM_SALARY` (Q11)
- `kind`: `CAPITAL_INVESTMENT | TEAM_ALLOWANCE | INTERNAL_SERVICES_ALLOWANCE | EXTERNAL_SERVICES_ALLOWANCE` (Q12)

### 2.2 State machine (Q6)

```
            activate              complete
  DRAFT ───────────────► ACTIVE ───────────► COMPLETED (terminal)
    │                      │
    │ delete (204)         │ terminate (cites a rule)
    ▼                      ▼
  (gone)                TERMINATED (terminal)
```

- **DRAFT**: metadata PATCH, canvas PUT, DELETE allowed. Everything else 409.
- **activate**: 409 if not DRAFT; 409 (`One ACTIVE VAM agreement already exists for this value stream`) if another ACTIVE agreement anchors the same VS (Q3) — checked in a transaction; sets `startedAt = now()`.
- **ACTIVE**: read-only except `complete` / `terminate` (Q14; plan-only per Q2 means no achievement toggles).
- **complete / terminate**: 409 unless ACTIVE; both set `endedAt`. Terminate accepts `{ citedTerminationConditionId?, note? }`; the citation is **required when the agreement has termination conditions**, must reference one of its own rules (404/400 otherwise), and is stored with the note (Q7).
- **COMPLETED / TERMINATED**: fully read-only; DELETE returns 409 (Q22). Renegotiation = new DRAFT.

### 2.3 Zod schemas (plugin `/shared`)

```ts
export const VAM_TRACKS = ['DIRECT_VALUE','INDIRECT_VALUE','VARIABLE_PAY','PROFIT_SHARING','EQUITY'] as const;
export const VAM_COST_CATEGORIES = ['SHARED_SERVICE_PLATFORMS','NODE_MICRO_ENTERPRISES','EXTERNAL_NODES','EMC_PARTICIPATION','LEADERS_SALARY','TEAM_SALARY'] as const;
export const VAM_INVESTMENT_KINDS = ['CAPITAL_INVESTMENT','TEAM_ALLOWANCE','INTERNAL_SERVICES_ALLOWANCE','EXTERNAL_SERVICES_ALLOWANCE'] as const;
export const VAM_STATUSES = ['DRAFT','ACTIVE','COMPLETED','TERMINATED'] as const;

const amountSchema = z.number().finite().nonnegative();      // responses carry decimals as strings (pg convention)

export const createVamAgreementSchema = z.object({
  title: z.string().min(1).max(255),
  valueStreamId: z.string().uuid(),
  platformId: z.string().uuid(),
  horizonMonths: z.number().int().min(1).max(120),
  currencyId: z.string().uuid().nullish(),
  agreementId: z.string().uuid().nullish(),                   // optional core-agreement mirror (Q4)
});

export const updateVamAgreementSchema = createVamAgreementSchema.partial();  // DRAFT-only PATCH

export const vamCanvasSchema = z.object({                     // the document PUT body (Q14)
  milestones: z.array(z.object({
    offsetMonths: z.number().int().min(1).max(120),
    label: z.string().max(255).nullish(),
    items: z.array(z.object({
      track: z.enum(VAM_TRACKS),
      description: z.string().min(1),
      amount: amountSchema.nullish(),
    })),
  })),
  costEntries: z.array(z.object({
    category: z.enum(VAM_COST_CATEGORIES),
    label: z.string().min(1).max(255),
    amount: amountSchema,
    headcount: z.number().int().positive().nullish(),
  })),
  investmentEntries: z.array(z.object({
    kind: z.enum(VAM_INVESTMENT_KINDS),
    label: z.string().max(255).nullish(),
    amount: amountSchema,
  })),
  terminationConditions: z.array(z.string().min(1)),
});

export const terminateVamAgreementSchema = z.object({
  citedTerminationConditionId: z.string().uuid().nullish(),
  note: z.string().nullish(),
});
```

Service-level canvas validation (beyond Zod): milestone `offsetMonths` unique within the payload and `≤ horizonMonths` (400 on violation). Array order defines `position` throughout.

## 3. API surface

All under `AdminGuard`, bodies via `ZodValidationPipe` (400 on invalid input, per core convention).

| Method & path | Behavior |
|---|---|
| `POST /plugins/rdhy/vam-agreements` | Create DRAFT with empty canvas. Validates FK targets exist (404 naming the missing one). `201`, summary shape. |
| `GET /plugins/rdhy/vam-agreements` | All agreements, `updatedAt DESC`, summary shape. Filtering is client-side (Q18). |
| `GET /plugins/rdhy/vam-agreements/:id` | Full document (summary + nested canvas). `404` unknown. |
| `PATCH /plugins/rdhy/vam-agreements/:id` | Metadata update. `409` unless DRAFT. Re-validates changed FKs. |
| `PUT /plugins/rdhy/vam-agreements/:id/canvas` | Transactionally replaces all children (Q14). `409` unless DRAFT. Returns the full document. |
| `POST /plugins/rdhy/vam-agreements/:id/activate` | DRAFT→ACTIVE. `409` on wrong status or second-ACTIVE-per-VS (Q3). |
| `POST /plugins/rdhy/vam-agreements/:id/complete` | ACTIVE→COMPLETED. `409` on wrong status. |
| `POST /plugins/rdhy/vam-agreements/:id/terminate` | ACTIVE→TERMINATED, body per `terminateVamAgreementSchema`; citation required when rules exist and must belong to the agreement. |
| `DELETE /plugins/rdhy/vam-agreements/:id` | `204` in DRAFT (children cascade); `409` otherwise (Q22). |
| `GET /plugins/rdhy/platforms/:id/vam-agreements` | Sponsored agreements (summary shape) for the platform detail section (Q17). |

**Changed existing endpoint:** `DELETE /plugins/rdhy/platforms/:id` now returns `409` (`Platform sponsors N VAM agreements`) when any `RdhyVamAgreement` references it — service check first, DB `RESTRICT` as backstop (Q23 resolution). Memberships still cascade as in spec 013.

**Shapes.** Summary: `{ id, title, status, horizonMonths, startedAt, endedAt, valueStream: {id, code, name}, platform: {id, code, name}, currency: {id, code, name} | null, agreementId, createdAt, updatedAt }`. Document adds `canvas: { milestones: [{ id, offsetMonths, label, items: [{ id, track, description, amount }] }], costEntries, investmentEntries, terminationConditions: [{ id, position, text }] }` plus `citedTerminationConditionId` / `terminationNote`. Amounts serialize as strings (Postgres decimal convention).

### Domain events (Q21)

`RdhyVamAgreement` joins `primaryEntities` → `marketlum.plugin.rdhy.rdhy_vam_agreement.created|updated|deleted`. Children emit nothing; transitions surface as `updated`. No custom lifecycle events in this slice.

## 4. Database / migration

One hand-written migration `packages/plugin-rdhy/src/migrations/<ts>-CreateRdhyVamTables.ts` (timestamp after `1700000000100`) creating the six tables per §2.1 idioms of the spec 013 migration (`uuid_generate_v4()`, quoted camelCase columns, named constraints, `IDX_` on every FK column). Down drops in reverse dependency order. Delivered via the plugin's `migrations` array — `pnpm migration:run` picks it up automatically.

## 5. Backend module layout

```
packages/plugin-rdhy/src/
  vam/
    rdhy-vam-agreement.entity.ts          (+ the five child entities, one file each)
    vam-agreements.controller.ts          # CRUD + canvas PUT + transitions
    vam-agreements.service.ts             # validation, transactions, state machine
  platforms/platforms.service.ts          # remove(): add sponsor check → 409
  platforms/platforms.controller.ts       # GET :id/vam-agreements (delegates to vam service)
  shared/vam-schemas.ts                   # §2.3 (re-exported from shared/schemas.ts barrel)
  seed/rdhy.seeder.ts                     # extended per §8
  index.ts                                # entities += 6, migrations += 1, primaryEntities += RdhyVamAgreement
```

`RdhyModule` registers the new entities via `TypeOrmModule.forFeature` and the new controller. The canvas PUT runs in a `DataSource.transaction` (delete children, re-insert from payload, bump `updatedAt`).

## 6. Web UI

Two new routes in `rdhyWebPlugin` (client components, `api` client, existing primitives only):

- `{ slug: 'vam-agreements', Component: VamAgreementsListPage }`
- `{ slug: 'vam-agreements/:id', Component: VamAgreementDetailPage }`

Nav: second item in the existing "RenDanHeYi" group — `plugin.rdhy.nav.vamAgreements` ("VAM Agreements" / "Umowy VAM"), icon e.g. `FileSpreadsheet`. Messages under `plugin.rdhy.vam.*` (en/pl).

### 6.1 List page (Q18)

Table: title, value stream, platform, status badge, horizon, updated. Two client-side `Select` filters (status, platform) above the table; "New agreement" button opens the create dialog (Q19: title, VS picker reusing the spec 013 flatten-tree search pattern, platform select, horizon, optional currency select) and navigates to the new draft's detail page.

### 6.2 Detail page — canvas read view (Q15)

```
 ← VAM Agreements                                    [DRAFT] [Edit canvas] [Activate] [Delete]
 Web 3 Consulting HUB          Web3 Stream · sponsored by Industrial Platform · 12 months · USD

 VALUE CO-CREATION AND SHARING
 ┌──────────────┬───────3m───────┬───────6m───────┬───────9m───────┬──────12m───────┐
 │ DIRECT VALUE │ All offerings  │ First 2        │ First $500K of │ Second $500K…  │
 │              │ prepared       │ projects sold  │ revenues       │ $250K margin   │
 │ INDIRECT V.  │ 10 prospects…  │ Network of 50… │ …              │ …              │
 │ VARIABLE PAY │                │ $50K bonus…    │ +$50K bonus…   │ $20K team…     │
 │ PROFIT SHAR. │                │                │ 10% profit…    │ 10% profit…    │
 │ EQUITY       │                │                │                │ 10% equity…    │
 └──────────────┴────────────────┴────────────────┴────────────────┴────────────────┘

 LIFECYCLE                                    TERMINATION CONDITIONS
 Sponsor: Industrial Platform                 1. Terminated if leading goals missed by >15%
                                              2. Terminated when exceeding cashflow allowance…

 OPERATING COSTS (total $590K)                INVESTMENTS (total $170K)
 Shared service platforms   $50K              Pre-allocated budget:
 Node micro-enterprises     $150K               Team allowance                $45K
 External nodes             $100K               Internal services allowance   $75K
 EMC participation          $150K               External services allowance   $50K
 Leaders salary (1)         $50K
 Team salary (3)            $90K
```

Header actions by status: DRAFT → Edit canvas / Activate / Delete; ACTIVE → Complete / Terminate; terminal → none (terminated shows the cited rule + note). Activate/Complete/Delete confirm via dialog; Terminate's dialog has a rule `Select` (required when rules exist) + note `Textarea`.

### 6.3 Edit mode (Q16)

"Edit canvas" (DRAFT only) switches the page to a sectioned editor: milestones editor (offset + label rows, add/remove), per-milestone item lists grouped by track (description + amount inputs), cost and investment entry tables, termination-rules list. Local state; one **Save** issues the canvas PUT, **Cancel** discards. Array order in the editor is display order.

### 6.4 Platform detail addition (Q17)

`PlatformDetailPage` gains a "Sponsored VAM agreements" section (title, status, horizon, link to detail) fed by `GET /plugins/rdhy/platforms/:id/vam-agreements`; the platform Delete confirm mentions sponsorship blocking when the fetch shows agreements.

## 7. App wiring & template sync

No `apps/*` file shapes change (routes/nav/messages all live inside the plugin package; both apps already register it). Per spec 013 Q19 the template stays lean — **no template updates expected**. The CLAUDE.md sync rule applies only if implementation unexpectedly alters an `apps/api|web` file structurally.

## 8. Seed data (Q20)

Extend `seedRdhy` (idempotent by `title + valueStreamId`):

1. **ACTIVE "Web 3 Consulting HUB"** — sponsor `industrial_platform`, anchored to the first seeded value stream, 12-month horizon, currency USD when the sample `usd` Value exists, `startedAt` = seed time. Canvas from the PDF: milestones 3/6/9/12 with ~15 items across all five tracks (e.g. 3m/DIRECT "All offerings prepared", 9m/DIRECT "First $500K of revenues delivered" amount 500000, 6m/VARIABLE_PAY "$50K bonus for owners" amount 50000, 12m/EQUITY "Owners invited to acquire 10% of equity"), six cost entries (§6.2 table, headcount 1 and 3 on the salary rows), four investment entries (capital line + $45K/$75K/$50K allowances), two termination rules (missed-goals >15%, cashflow-allowance breach).
2. **Empty DRAFT "Web 3 Consulting HUB — renewal"** — same anchor/sponsor, no canvas content.

## 9. BDD coverage

Plugin-owned features, steps in `apps/api/test/plugins/rdhy/` (helpers extended from spec 013's `rdhy-helpers.ts`).

**`vam-agreements.feature`** (~8): create draft (201 + summary + created event); 404s for unknown VS/platform/currency; 400 invalid horizon; list ordered by update with summaries; get document; PATCH metadata in DRAFT (+ updated event); PATCH on ACTIVE → 409; DELETE draft → 204 (+ deleted event); DELETE on ACTIVE → 409.

**`vam-canvas.feature`** (~6): PUT full canvas → document echoes all sections in order; re-PUT replaces (old children gone); duplicate `offsetMonths` → 400; `offsetMonths > horizonMonths` → 400; invalid track/category → 400; PUT on ACTIVE → 409.

**`vam-lifecycle.feature`** (~9): activate sets ACTIVE + `startedAt`; second ACTIVE for same VS → 409; activate non-draft → 409; complete sets COMPLETED + `endedAt`; terminate citing a rule stores citation + note; terminate without citation when rules exist → 400; terminate with foreign rule id → 400; complete/terminate from DRAFT → 409; platform delete while sponsoring → 409 (and succeeds after the agreement's VS is deleted, cascading the agreement).

**`seed.feature`** (+1 scenario): seed hook run twice yields exactly one ACTIVE canvas with 4 milestones + one DRAFT.

≈24 new scenarios. Web verified via `tsc` (`apps/web` `--noEmit` + plugin build), per project practice.

## 10. Permissions

`AdminGuard` at controller level, matching every existing plugin/core controller. No new roles.

## 11. Out of scope

- Achievement tracking, plan-vs-actual, reward computation — **spec 015** (Q2 override).
- Custom or extensible tracks (Q10), structured/evaluable termination rules (Q7), per-entry currency (Q13).
- Inline-editable canvas grid (Q16) — later layer over the same PUT.
- Granular child CRUD endpoints (Q14) and custom lifecycle events (Q21).
- `MicroEnterprise` as anchor (Q1) — a later migration may retarget the FK.
- Server-side list filtering/pagination (Q18), VS-side surfaces (core untouchable), template registration.

## 12. Delivery plan (Q24)

One PR, ordered commits:

1. **Feature files** — the three new `.feature` files + the seed scenario (strict BDD: before any endpoint code).
2. **Backend** — entities, migration, schemas, service/controller, platform-delete guard, seeder, plugin export updates.
3. **Web slice** — list page + create dialog, canvas read view, sectioned editor, transition dialogs, platform-page section, nav + i18n.
4. **BDD steps** — step definitions, full plugin + adjacent suites green.
