# 013 — RenDanHeYi Plugin: Platforms (Brainstorming)

> **Goal:** Start the RenDanHeYi (RDHY) plugin with its first vertical slice: a plugin-owned `RdhyPlatform` entity and a relationship between core `ValueStream`s and platforms — without violating the spec 012 rule that plugins never extend or alter core entities.

> **Process:** Structured Q&A in rounds. Each question offers mutually-exclusive options; the recommended one is preselected with `[x]`. Move the `[x]` to override, and/or write below the `**Answer:**` line. This file is append-only — new rounds are added at the bottom, existing content is never edited.

## Context

**What exists today:**

- **Plugin system (spec 012)** is live: `MarketlumCoreModule.forRoot({ plugins })`, typed `MarketlumApiPlugin` contract (`packages/core/src/plugins/marketlum-api-plugin.ts`) with `entities`, `migrations`, `primaryEntities`, `settings`, `seed`. Plugin tables must be prefixed `plugin_<id>_` (enforced by `validatePlugins`). Frontend: `MarketlumWebPlugin` with nav/routes rendered under `/admin/x/[...slug]`, i18n under `plugin.<id>.*`.
- **`@marketlum/plugin-nbp`** is the only plugin so far (settings + ingestion, no own tables). **`packages/plugin-rdhy` does not exist** — spec 012's planned "PR 2" (RDHY slice with `MicroEnterprise` + `EmcAgreement`, §8.1) was never implemented. Spec 013 therefore also creates the plugin package itself.
- **`ValueStream`** (`packages/core/src/value-streams/entities/value-stream.entity.ts`): closure-table tree (`code`, `name`, `purpose`, `level`, `parent`/`children`, `lead` → User, `image` → File, `agent` → Agent).
- **Hard constraint (spec 012 §15):** plugins must not extend/alter core entities; core must not reference plugin entities. One-way dependency only — plugins *may* hold FKs **to** core tables (the sanctioned pattern: `EmcAgreement.valueStreamId → value_streams(id)`).

**Consequence:** `value_streams` cannot gain an `rdhyPlatformId` column, and core `ValueStream` API responses cannot mention platforms. The relationship must live in plugin-owned tables and be exposed via plugin endpoints (`/plugins/rdhy/...`).

```
        core (never touched)                 plugin_rdhy_* (owned by plugin)
  ┌──────────────────────────┐         ┌────────────────────────────────────┐
  │ value_streams            │         │ plugin_rdhy_platforms              │
  │  id, code, name, ...     │         │  id, code, name, ...               │
  └────────────▲─────────────┘         └───────────────▲────────────────────┘
               │ FK (one-way,                          │ FK
               │  plugin → core)                       │
  ┌────────────┴──────────────────────────────────────┴────────────────────┐
  │ plugin_rdhy_platform_value_streams (link table — one shape option)     │
  │  platformId, valueStreamId [UNIQUE?]                                   │
  └────────────────────────────────────────────────────────────────────────┘
```

**RenDanHeYi background:** In Haier's model, *platforms* are shared-service or industry groupings that host micro-enterprises (MEs). Spec 012 §8.1 sketched `MicroEnterprise` (`kind: MARKET_ME | NODE_ME | PLATFORM_ME`) and `EmcAgreement`; the full domain (VAM, leading targets, two-way contracting, platforms) was explicitly deferred to spec 013.

---

## Round 1 — Foundations

Scope, cardinality, and the structural decisions everything else hangs on.

### Q1. Scope of spec 013

Spec 012 deferred "the full RenDanHeYi domain" here, but its planned RDHY starter slice (MicroEnterprise + EmcAgreement) was never built either. What does this spec cover?

- [x] **Platforms only** — `RdhyPlatform` + the ValueStream relationship + plugin package scaffolding. Smallest useful slice; MEs/agreements/VAM come in later specs once the platform grouping exists.
- [ ] **Platforms + revive the §8.1 sketch** — also `MicroEnterprise` and `EmcAgreement` in this spec. One bigger PR, but delivers spec 012's unfinished PR 2 alongside the new entity.
- [ ] **Full RDHY domain** — platforms, MEs, agreements, VAM, leading targets. Comprehensive but a very large spec/PR; high risk of stalling.

**Answer:**

### Q2. Platform ↔ ValueStream cardinality

How many platforms can a value stream belong to, and how many value streams can a platform host?

- [x] **Many value streams → one platform** — a VS belongs to at most one platform; a platform hosts many VSs. Matches RDHY (an ME/stream sits on one platform). Implemented as a link table with `valueStreamId UNIQUE`.
- [ ] **Many-to-many** — a VS can join several platforms. Maximum flexibility, but weakens "the platform" as an organizing dimension and complicates every rollup/filter later.
- [ ] **One platform → one anchor value stream** — the platform itself is represented by a single VS (FK on `plugin_rdhy_platforms`). Simplest table, but can't express membership of multiple streams.

**Answer:**

### Q3. Physical shape of the relationship

Given the one-way dependency rule, where does the association live? (If Q2 = many-to-one, both link-table options behave identically for the API; this is about schema style.)

- [x] **Dedicated link table** — `plugin_rdhy_platform_value_streams(id, platformId FK CASCADE, valueStreamId FK CASCADE UNIQUE, createdAt)`. Survives a later cardinality change (drop the UNIQUE), keeps `plugin_rdhy_platforms` a pure catalog table, gives membership its own timestamps/events.
- [ ] **Membership entity with extra semantics now** — same table but with fields like `role` or `assignedByUserId` from day one. Only worth it if we already know what metadata membership needs.
- [ ] **Bend the core rule** — add `rdhyPlatformId` to `value_streams` via a core migration. Simplest queries, but breaks spec 012's architecture and couples core to a plugin; would need a core-side "extension column" concept first.

**Answer:**

### Q4. Tree semantics

`ValueStream` is a closure-table tree. Does platform assignment interact with the hierarchy?

- [x] **Node-local, no inheritance** — assignment applies only to the exact VS node; descendants are unassigned unless assigned themselves. Simple, predictable, no computed reads. Inheritance can be layered on later as a read-time concept without schema change.
- [ ] **Inherited by descendants** — a child VS resolves its "effective platform" from the nearest assigned ancestor; explicit assignment overrides. Convenient for rollups, but every read needs ancestor resolution and the UI must distinguish direct vs inherited.
- [ ] **Roots only** — only top-level value streams may be assigned to a platform (validated at assign time). Cleanest mental model, but arbitrary if teams organize below the root.

**Answer:**

### Q5. Entity and class naming

The table is `plugin_rdhy_platforms` either way; this is about the TypeScript class and API vocabulary.

- [x] **`RdhyPlatform`** — unambiguous when imported next to core entities in `apps/api` tests and seeders, and "platform" alone is an overloaded word (the product itself is a platform). Matches the name used in the request.
- [ ] **`Platform`** — plugin namespace already disambiguates (table prefix, `/plugins/rdhy/...` routes, `plugin.rdhy.*` i18n); shorter everywhere inside the plugin. Risk: vague in cross-package imports and event-log reading.

**Answer:**

### Q6. Fields on `RdhyPlatform`

What does the platform entity carry in this first slice? (All options include `id`, timestamps.)

- [x] **Core-conventional catalog entity** — `code` (unique, snake_case per spec 008 conventions), `name`, `description text nullable`. Mirrors how core entities are shaped; enough to group streams and render list/detail pages.
- [ ] **Minimal** — `name` only. Fastest, but skipping `code` breaks the project-wide entity-codes convention (spec 008) and makes seeding/BDD references brittle.
- [ ] **Richer from day one** — also `status enum(ACTIVE, ARCHIVED)`, `leadUserId → users`, `agentId → agents`. More RDHY-faithful, but each extra FK/enum adds validation, UI, and BDD surface before we know it's needed.

**Answer:**

### Q7. Delete semantics

What happens on deletion, on both sides?

- [x] **Detach on both sides** — deleting a platform cascades its link rows (streams simply become unassigned); deleting a VS cascades its link row (DB-level `ON DELETE CASCADE`, so core stays unaware). No blocking, no orphans.
- [ ] **Block platform delete while it has members** — `409` until all streams are unassigned. Safer against accidents, but adds friction and an extra error path for little protection (membership is cheap to recreate).
- [ ] **Archive instead of delete** — platforms get a `status` and are never hard-deleted. Preserves history, but core entities don't follow this pattern and it drags in the `status` field from Q6's richer option.

**Answer:**

---

## Round 2 — API surface & behavior

Round 1 locked: platforms-only scope, many-VS-to-one-platform via a unique link table, `RdhyPlatform(code, name, description)`, node-local assignment, cascade-detach deletes. This round shapes the endpoints under `/plugins/rdhy/...` and the plugin's event/validation behavior.

### Q8. Assignment API style

How does a client attach a value stream to a platform? (All options sit under the plugin namespace and `AdminGuard`.)

- [x] **Value-stream-centric singleton** — `PUT /plugins/rdhy/value-streams/:valueStreamId/platform` (body: `{ platformId }`) and `DELETE /plugins/rdhy/value-streams/:valueStreamId/platform`. Mirrors the Q2 cardinality exactly: "the platform of a VS" is a single settable property; PUT is naturally idempotent.
- [ ] **Platform-centric collection** — `POST /plugins/rdhy/platforms/:id/value-streams` + `DELETE /plugins/rdhy/platforms/:id/value-streams/:valueStreamId`. Reads well from the platform page, but "add to collection" semantics fight the one-platform-per-VS rule (a POST can implicitly remove membership elsewhere).
- [ ] **Membership as a first-class resource** — `POST /plugins/rdhy/memberships`, `DELETE /plugins/rdhy/memberships/:id`. Most generic and survives a many-to-many future, but forces clients to track membership ids for what is conceptually a single field.

**Answer:**

### Q9. Reassignment behavior

A value stream already assigned to platform A gets assigned to platform B.

- [x] **Silent move (upsert)** — the PUT replaces the existing link row; response reflects the new platform. Consistent with PUT semantics and with membership being cheap to change; no extra error path.
- [ ] **Conflict (409)** — client must DELETE the existing assignment first. Protects against accidental moves, but doubles the calls for the common "reorganize" flow and adds a state the UI must handle.
- [ ] **Explicit flag** — silent move only with `?force=true`, otherwise 409. Maximum safety, maximum ceremony.

**Answer:**

### Q10. Read surface

What read endpoints does the slice ship?

- [x] **Platform CRUD + both lookups** — `GET /plugins/rdhy/platforms` (list), `GET /plugins/rdhy/platforms/:id` (detail with member value-stream summaries embedded), `GET /plugins/rdhy/value-streams/:valueStreamId/platform` (reverse lookup, 200 with `null` when unassigned). Covers the platform pages and any per-VS decoration.
- [ ] **Also a bulk assignments endpoint** — additionally `GET /plugins/rdhy/assignments` returning all `(valueStreamId, platformId)` pairs, for decorating the whole VS tree in one call. Useful later, but no UI in this slice needs it yet.
- [ ] **Platforms only** — list/detail with members; no reverse lookup. Fewest endpoints, but the per-VS question ("which platform is this on?") then requires scanning all platforms client-side.

**Answer:**

### Q11. Platform list behavior

How does `GET /plugins/rdhy/platforms` behave?

- [x] **Plain sorted list** — all platforms ordered by `name`, member counts included (`memberCount` via a count subquery). Platforms are a small organizational catalog (like locales/currencies in core); pagination and search would be dead weight.
- [ ] **Paginated + searchable from day one** — query params for page/limit/search. Future-proof, but core's small-catalog endpoints don't do this either; add it when a deployment actually has many platforms.

**Answer:**

### Q12. Domain events

Which classes go into the plugin's `primaryEntities` (auto-emitting `marketlum.plugin.rdhy.<entity_snake>.<created|updated|deleted>`)?

- [x] **`RdhyPlatform` only** — matches the core convention that join/link entities are skipped by the domain-event subscriber. Assignment-change events can be added the moment a consumer (e.g. a future RDHY rollup) needs them.
- [ ] **Platform + link entity** — also emit `marketlum.plugin.rdhy.rdhy_platform_value_stream.*` on assign/detach. Assignment is arguably business-meaningful, but nothing consumes it yet and the event name is awkward; easy to add later.

**Answer:**

### Q13. `code` rules

Validation and mutability of `RdhyPlatform.code`.

- [x] **Immutable, core-conventional** — pattern `/^[a-z][a-z0-9_]*$/`, max 64, unique; present in the create schema, absent from the update schema (exactly how core entities treat `code` per spec 008). Codes are stable references for seeds/BDD/imports.
- [ ] **Editable** — code appears in the update schema too. Convenient for fixing typos, but breaks the "stable reference" contract every other entity honors.

**Answer:**

---

## Round 3 — Web UI & UX

One grounding fact for this round: core admin entities follow a **list page + `[id]` detail page** convention (`admin/value-streams/[id]`, `admin/agents/[id]`), but the plugin route resolver (`usePluginRoute` in `packages/ui/src/plugins/plugin-registry.tsx`) matches slugs by **exact equality** — plugin pages currently cannot have dynamic segments like `platforms/:id`. Also fixed by spec 012: plugins cannot inject UI into core pages (extension points are nav, routes under `/admin/x/`, and settings), and RDHY needs no settings panel.

### Q14. Platform detail — routing mechanism

The platform detail view (where members are managed) needs to be reachable somehow.

- [x] **Extend the plugin route resolver with dynamic segments** — support `slug: 'platforms/:id'` (prefix/pattern match, params passed to the Component). A small `@marketlum/ui` change that brings plugin pages up to the core list+detail convention and benefits every future plugin (spec 012 §8 already assumed "list + detail + form pages" for RDHY).
- [ ] **Query-param detail** — single `platforms` route reads `?id=...` for the detail view. No core change and still deep-linkable, but diverges from the core URL convention and complicates the page component (two views in one route).
- [ ] **Dialogs only** — list page with create/edit dialogs; member management inside a sheet/dialog. Zero routing work, but managing a long member list in a dialog is cramped and nothing is deep-linkable.

**Answer:**

### Q15. Navigation placement

Where does the entry point live in the sidebar?

- [x] **New "RenDanHeYi" group** — nav item "Platforms" under a new group (via `group` + `groupLabelKey`), as spec 012 §8.4 already planned. Future RDHY pages (MEs, agreements) join the same group; plugin identity stays visible.
- [ ] **Existing core group** — e.g. under `system`. One less group heading, but buries a domain concept among infrastructure and pre-empts the future RDHY pages' home.
- [ ] **Ungrouped item** — floats at the end of the nav. Simplest, but inconsistent once a second RDHY page exists.

**Answer:**

### Q16. Member management on the platform detail page

How does an admin attach/detach value streams?

- [x] **Member table + searchable add-combobox** — detail page lists current members (code, name, level; remove button per row); a combobox searches all value streams (hierarchical label, e.g. `parent / child`) and assigns on select. If the picked VS is on another platform, it silently moves (Q9) — show the previous platform in the option label as a hint. Reuses existing form/table primitives.
- [ ] **Dual-list transfer widget** — assigned vs unassigned side by side. Good for bulk moves, but no such primitive exists in `@marketlum/ui` yet; new component for marginal benefit.
- [ ] **Value-stream tree with checkboxes** — mirrors the VS hierarchy. Visually rich, but node-local semantics (Q4) make a tree suggest inheritance that doesn't exist.

**Answer:**

### Q17. Reverse visibility ("which platform is this VS on?")

Core value-stream pages cannot be extended to show platform membership. Does this slice offer any VS-side view?

- [x] **Not in this slice** — the reverse-lookup API endpoint (Q10) exists, and platform pages show membership; a VS-side surface waits until there's a real consumer (or until core grows generic UI extension slots, which is its own spec).
- [ ] **A plugin "Assignments" page** — a third route listing every value stream with its platform (sortable/filterable). Answers the reverse question in the UI today, but duplicates the VS list and adds a page to maintain.
- [ ] **Propose core UI extension slots now** — design a core mechanism for plugins to add panels to core detail pages. The "right" long-term answer, but a significant core-UI spec of its own; would stall this slice.

**Answer:**

---

## Round 4 — Integration, seeding, tests, delivery

Last round. Permissions are not questioned: all plugin endpoints sit behind the existing `AdminGuard`, matching every core controller and NBP. Validation is Zod via `ZodValidationPipe`, schemas shipped from the plugin's `/shared` entry (the NBP pattern) — also not worth a question.

### Q18. Seed data

The `MarketlumApiPlugin.seed` hook exists (spec 012 planned an `rdhy.seeder.ts`).

- [x] **Seed platforms + assignments** — `pnpm seed:sample` seeds 2–3 platforms (e.g. `industrial_platform`, `shared_services`) and assigns a handful of the sample value streams. Demo data makes the plugin pages meaningful immediately and exercises the seed hook end-to-end.
- [ ] **Seed platforms only** — catalog rows but no assignments. Less coupling to which sample VSs exist, but the detail page demos empty.
- [ ] **No seed** — like NBP. Fine for a settings-only plugin, wrong for an entity-bearing one.

**Answer:**

### Q19. `create-marketlum-app` template

Spec 012 decided to keep the scaffold template lean (plugins demonstrated in the repo's own apps, not pre-registered in the template).

- [x] **Stay lean** — the template's `plugins.ts` / `webPlugins` / `plugin-messages.ts` keep their current (empty or NBP-commented) state; RDHY is not added. Only if this spec changes the *shape* of those wiring files does the template need touching (the CLAUDE.md sync rule still applies to any `apps/*` file whose structure changes).
- [ ] **Register RDHY in the template** — scaffolded projects ship with the RDHY plugin active. Showcases the plugin system, but forces an opinionated domain model on every new project and contradicts the spec 012 decision.

**Answer:**

### Q20. BDD feature location & coverage

Core plugin-system features live in `packages/bdd/features/plugins/`; NBP's own features live inside the plugin (`packages/plugin-nbp/features/`).

- [x] **Plugin-owned features** — `packages/plugin-rdhy/features/platforms.feature` + `assignments.feature` (+ `seed.feature`), step definitions in `apps/api/test/plugin-rdhy/`, app bootstrapped with the real `plugins` array. Expected scenarios: platform CRUD + code validation/uniqueness (~6), assign/reassign/detach + reverse lookup + 404s (~6), cascade on VS delete and platform delete (~2), `rdhy_platform` events (~2), seed (~1) — roughly 17.
- [ ] **Central features** — put them in `packages/bdd/features/rdhy/`. Keeps all features in one package, but breaks the precedent that a plugin owns its own feature files (part of the "plugin is self-contained" story).

**Answer:**

### Q21. Delivery shape

The route-resolver extension (Q14) touches `@marketlum/ui`; everything else is the new package + app wiring.

- [x] **One PR, ordered commits** — (1) `@marketlum/ui` route resolver with dynamic segments, (2) plugin package: entities, migration, module, schemas, seeder, (3) web slice + wiring + i18n, (4) BDD features + steps. The resolver change is small and this slice is its only consumer today; splitting PRs adds process without review benefit.
- [ ] **Two PRs** — resolver extension first (with its own tests), plugin second. Cleaner separation and independently revertable, but the resolver change is hard to review without its consumer.

**Answer:**
