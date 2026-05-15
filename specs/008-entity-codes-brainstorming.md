# 008 — Entity Codes

> **Goal:** Give each of `Value`, `ValueInstance`, `Taxonomy`, `Channel`, `ValueStream`, `AgreementTemplate`, `Pipeline`, and `Archetype` a unique, snake_case `code` field — a stable, human-readable identifier separate from the UUID `id` and the human-friendly `name`.

> **Process:** Append-only. We add one round per turn; you reply by moving `[x]` to the option you want and/or writing free-form text after `**Answer:**`. Existing content is never rewritten.

## Context

Today none of these eight entities has any stable, human-readable identifier besides the auto-generated UUID `id` and the editable display `name`:

| Entity              | Tree?       | Unique today      | Notable cross-refs                                       |
|---------------------|-------------|-------------------|----------------------------------------------------------|
| `Value`             | flat (self-FK `parentId`) | name not unique  | referenced by `ValueInstance`, transactions, exchanges    |
| `ValueInstance`     | flat        | name not unique   | concrete realisation of a `Value` (`valueId` FK)         |
| `Taxonomy`          | closure tree | name not unique   | many-to-many with `Value`, `Archetype`                   |
| `Channel`           | closure tree | name not unique   | linked from agents / exchanges                            |
| `ValueStream`       | closure tree | name not unique   | hierarchical org-of-value structure                       |
| `AgreementTemplate` | closure tree | `name` is unique  | typed (`AgreementTemplateType`)                          |
| `Pipeline`          | flat        | name not unique   | belongs to a `ValueStream`                                |
| `Archetype`         | flat        | `name` is unique  | bundles taxonomies                                       |

The only entity in the codebase that already has a similar field is `Geography.code` (free-form `varchar`, e.g. ISO codes like `PL`, `US-CA`). It is **not** snake_case-validated today; the service layer just throws a `ConflictException` on Postgres `23505` (`Geography with this code already exists`). See `packages/core/src/geographies/geographies.service.ts:82`.

```
            ┌──────────────────────────────────────────────────────┐
            │ Eight entities, each gets a new column:               │
            │   code: varchar  (snake_case, unique within entity)   │
            │                                                       │
            │  values.code        taxonomies.code                   │
            │  value_instances.code  channels.code                  │
            │  value_streams.code  agreement_templates.code         │
            │  pipelines.code      archetypes.code                  │
            └──────────────────────────────────────────────────────┘
```

Why this matters: codes give us stable references for seed data, imports/exports, deep-link URLs, and external integrations — none of which want to bake UUIDs into config or expose them in URLs.

Validation pattern reference: project already uses Zod schemas in `@marketlum/shared` (e.g. `packages/shared/src/schemas/geography.schema.ts`); migrations live in `packages/core/src/migrations/`; seeders in `packages/core/src/commands/seeders/`.

---

## Round 1 — Foundations

This round pins down the meaning of "unique" and how the code gets onto a row in the first place.

### Q1.1 — Field name

What should the column be called across all eight entities?

- [x] **`code`** — short, matches existing precedent (`Geography.code`); reads naturally next to `name`.
- [ ] **`slug`** — common in CMS contexts but implies URL-derived-from-title; we want stronger semantics than that.
- [ ] **`key`** — too generic; collides with the JS reserved-word vibe and with i18n `key`s.
- [ ] **`identifier`** — verbose, and we already have `id` (the UUID); two "identifiers" is confusing.

**Answer:**

### Q1.2 — Required at creation?

Is `code` required when a row is created, or can it be added later?

- [x] **Required (NOT NULL) — must be provided at create time** — guarantees every row is referenceable from day one; matches `Geography.code` and avoids a second class of "incomplete" entities.
- [ ] **Optional (nullable) — backfilled when needed** — softer migration story, but you lose the "stable identifier" guarantee and need null-checks everywhere downstream uses it.
- [ ] **Required on create, but auto-derived from name if omitted** — feels friendly, but auto-derivation produces collisions and silent name-mangling (`Marketing 2.0` → `marketing_2_0`?). Better as a UI affordance than a server fallback (see Q3.2).

**Answer:**

### Q1.3 — Uniqueness scope

"Unique" — within what set?

- [x] **Unique within the entity table (single global `UNIQUE` constraint per table)** — simplest, predictable, mirrors `Geography.code` and the existing `agreement_templates.name`/`archetypes.name` uniqueness. Lookups are O(1) by `(table, code)`.
- [ ] **Unique within a parent for tree entities (Taxonomy/Channel/ValueStream/AgreementTemplate), global elsewhere** — allows `marketing/email` and `sales/email` to coexist; richer, but the constraint must be enforced with a partial unique index on `(parentId, code)` and complicates moves/reparenting.
- [ ] **Unique across all eight entities (one global "code namespace")** — overkill; a `Value` code and a `Pipeline` code never collide in practice because they're queried via different endpoints.

**Answer:**

### Q1.4 — Mutability

Once a code is set on a row, can it be changed?

- [ ] **Mutable, but only via an explicit update — same endpoint as other fields, with the unique-violation error path covered** — codes are useful precisely because they're stable, but mistakes happen at creation; making them immutable would force row recreation just to rename `valu_stream_x` → `value_stream_x`.
- [x] **Immutable after creation** — safest for external integrations, but punitive for typos; we don't have any external code consumers yet, so this is over-strict for v1.
- [ ] **Mutable, with a deprecation/redirect table tracking old codes** — solves the "external link rot" problem, but we have no callers that would benefit from it today.

**Answer:**

### Q1.5 — Scope of this PR

Eight entities is a lot. Do we ship them all at once, or stage?

- [x] **All eight in a single PR** — one migration, one shared validator, one BDD scenario template applied per entity; lower coordination cost than eight separate PRs, and the change per entity is small.
- [ ] **Phase 1: tree entities (Taxonomy/Channel/ValueStream/AgreementTemplate); Phase 2: flat (Value/ValueInstance/Pipeline/Archetype)** — only worth it if Q1.3 picks parent-scoped uniqueness (different DDL/validation per phase); otherwise it's artificial splitting.
- [ ] **One entity at a time, starting with `Value`** — safest but eight migrations and eight rounds of template-sync work; only justified if we anticipate the schema diverging per entity, which we don't.

**Answer:**

---

## Round 2 — Shape & validation

Round 1 settled that `code` is required, immutable, and unique-per-table. This round nails down what a valid `code` string actually looks like — the regex, the limits, and how strictly we reject vs normalise input.

### Q2.1 — Snake_case regex

What exact pattern must a code match?

- [x] **`^[a-z][a-z0-9_]*$`** — must start with a lowercase letter, then lowercase letters / digits / underscores. Rules out `_foo`, `9_lives`, `Foo`, kebab-case, and accidental whitespace. This is the canonical "snake_case identifier" rule.
- [ ] **`^[a-z0-9_]+$`** — allows leading digits/underscores. More permissive but lets `_private`, `123` slip through; those are rarely what anyone means by "snake_case".
- [ ] **`^[a-z][a-z0-9_]*[a-z0-9]$`** — also forbids trailing underscore. Stricter, but arguably cosmetic; the regex gets fussy ("must be at least 2 chars") for negligible gain.
- [ ] **Loose: any string with no whitespace / uppercase** — gives up most of the structural value of having "snake_case" in the contract.

**Answer:**

### Q2.2 — Length bounds

How short / long can a code be?

- [x] **2–64 characters** — long enough for `marketing_email_outbound_v2`, short enough to fit in tables and URLs; rules out single-letter codes that collide with future shortcut keys / params.
- [ ] **1–255 characters (varchar default)** — minimal constraint; lets users invent absurdly long codes and tiny one-letter ones.
- [ ] **3–32 characters** — tighter; safer for URLs but bites when value-stream names get descriptive (`customer_onboarding_post_signup` is 30 chars already).
- [ ] **No length limit (text column)** — pointless flexibility; we'd still need a Zod max to stop abuse.

**Answer:**

### Q2.3 — Input normalisation vs strict rejection

If a user submits `"Marketing Email"` or `" marketing_email "`, what does the API do?

- [x] **Reject with a 400 — the value must already be valid snake_case** — predictable, no hidden mangling, mirrors Zod-first validation everywhere else; the UI is responsible for offering a "Generate from name" affordance (see Q3.2).
- [ ] **Trim whitespace, lowercase, replace spaces with `_`, then validate** — friendlier, but two clients sending `"Marketing Email"` and `"marketing_email"` end up with the same row, which is surprising; also makes the "what's the canonical form?" question fuzzy.
- [ ] **Trim only, no case/space changes** — half-measure: forgives copy-paste padding but still rejects `Marketing Email`. Probably fine, but worth being explicit.

**Answer:**

### Q2.4 — Column type & index

How is the column stored and indexed at the DB level?

- [x] **`varchar(64) NOT NULL` + dedicated `UNIQUE` constraint per table (named `UQ_<table>_code`)** — matches the length bound, keeps the constraint name predictable for migrations and for the `23505` error path; the unique constraint *is* the index for lookups.
- [ ] **`text NOT NULL` + `UNIQUE` constraint** — no length limit at the DB level (Zod still caps it); slightly more flexible, but inconsistent with `varchar` precedent on `name`/`code` columns in this repo.
- [ ] **`citext` (case-insensitive text) + `UNIQUE`** — would catch `Marketing` vs `marketing` collisions, but redundant given Q2.1 forbids uppercase entirely; adds an extension dependency.

**Answer:**

### Q2.5 — Reserved / forbidden codes

Should anything be off-limits — e.g. to keep room for system semantics later?

- [x] **Nothing reserved in v1** — codes are user-defined; if we ever need a "system" namespace we can introduce a prefix convention then. Forbidding without a concrete need is speculative.
- [ ] **Reserve a `system_` prefix for seeded / framework rows** — clean separation, but we don't currently treat any seed data as untouchable, so this would be enforcement without a use case.
- [ ] **Forbid a tiny denylist (`new`, `edit`, `create`, `delete`, `id`)** — protects future route segments like `/admin/values/new` from colliding with a row whose code is literally `new`; minor but cheap insurance.

**Answer:**

---

## Round 3 — UI / UX

Round 2 settled the wire-level validation. This round decides where codes appear in the admin UI, how the create form helps users come up with valid codes, and whether codes ever appear in URLs.

### Q3.1 — List-view visibility

Where do codes show up in the eight admin list pages (`values-page.tsx`, `taxonomies-page.tsx`, etc.)?

- [x] **Dedicated `Code` column, after `Name`, monospace font** — discoverable; copy-pasteable; matches how `Geography.code` is rendered today.
- [ ] **Inline next to the name (e.g. `Marketing Email  marketing_email`)** — compact, but cluttered for long names and impossible to sort/filter by code.
- [ ] **Hidden in lists, only visible on the detail page** — keeps tables clean but defeats the "stable reference" benefit (you'd have to drill in just to grab the code for a script).
- [ ] **Hidden by default, toggleable column** — adds a "view options" panel none of the other admin pages have today; over-engineering.

**Answer:**

### Q3.2 — Create-form affordance

`code` is required and the API will 400 anything non-snake_case. How does the create form help?

- [x] **Auto-fill the `code` field from the `name` field on every keystroke until the user manually edits the code; then stop syncing** — same UX as Wordpress slugs and shadcn/ui form examples; lets users override but ensures the field is never empty by accident.
- [ ] **Show a "Generate from name" button, no auto-sync** — explicit and predictable, but most users won't notice the button; first-submission 400s will be common.
- [ ] **No client-side help — user types both fields independently** — purest, but every first-time user will hit a 400 on submit; bad onboarding.
- [ ] **Auto-fill *and* lock the field to read-only** — friendly but takes away the override path we need (e.g. when the name has special chars the slugifier mangles badly).

**Answer:**

### Q3.3 — Slugify helper (client-side only)

The auto-fill in Q3.2 needs a "name → suggested code" function. What does it do?

- [x] **Lowercase, trim, replace non-`[a-z0-9]` runs with `_`, strip leading/trailing `_`, drop result if it doesn't satisfy `^[a-z][a-z0-9_]*$` (e.g. starts with a digit → empty suggestion)** — predictable, lossy-but-honest; lives as a pure function in `@marketlum/shared` so server-side seeders and BDD steps can use the same logic.
- [ ] **Same, but transliterate Unicode first (`é` → `e`, `ł` → `l`)** — better for international names, but pulls in an extra dependency (`slugify` / `unidecode`) for marginal benefit; users can fix the suggestion manually.
- [ ] **Server-side endpoint `POST /codes/suggest` that returns a unique suggestion** — handles collisions ("if `marketing_email` exists, suggest `marketing_email_2`"), but adds a network round-trip and a new endpoint; collisions can surface as a 409 on actual submit instead.

**Answer:**

### Q3.4 — Detail page display

Where does the code appear on each entity's detail page (`value-detail-page.tsx`, etc.)?

- [x] **As a small monospace badge next to the title, with a click-to-copy affordance** — visible without dominating; supports the "grab the code for a script" use case directly.
- [ ] **As a read-only field in the edit form section** — discoverable but buried; doesn't help users who land via a deep link and want to confirm the code.
- [ ] **Both: badge in the header *and* a read-only field in the form** — slight redundancy; arguably worth it given codes are immutable and users will want to verify them.
- [ ] **Not displayed (only in API/URLs)** — hides the most useful new field; rejects the premise.

**Answer:**

### Q3.5 — Admin URLs

Today, all eight entities use `/admin/<entity>/[id]` where `[id]` is the UUID. Do codes replace or augment the URL?

- [x] **Keep UUIDs in URLs; codes are a display/API concept only** — zero routing churn; sidesteps the question of what happens if a row's code gets fixed by recreating the row (since Q1.4 picked immutability, this can still happen between deletes/creates). All eight admin pages stay as `[id]`.
- [ ] **Switch to `/admin/<entity>/[code]` everywhere** — prettier URLs, but every page, link, and BDD step that interpolates a UUID needs updating; also forces all entities to have codes resolvable in one DB lookup (already the case post-migration, fine).
- [ ] **Support both: `/admin/<entity>/[id-or-code]` resolved by the page loader** — most flexible, but doubles the loader logic and the test matrix; not worth it without a concrete consumer.
- [ ] **Keep UUIDs in admin URLs, but add canonical short URLs `/v/[code]` for public-facing reference** — interesting for sharing, but speculative — no public surface exists yet.

**Answer:**

### Q3.6 — Global search inclusion

The repo has a global `/admin/search` page (`search-page.tsx`). Should it match against `code`?

- [x] **Yes — `code` is included in the searchable text alongside `name` for all eight entities** — codes are exactly the kind of stable identifier users will paste into search; cheap to add to existing tsvector triggers.
- [ ] **Only name search; codes are for explicit API/URL use** — keeps search results name-focused, but surprises users who search for `marketing_email` and get nothing.
- [ ] **Separate "search by code" mode toggle** — adds UI for a problem that doesn't exist; one tsvector handles both fine.

**Answer:**

---

## Round 4 — Integration, migration, delivery

Round 3 settled the UX. This last round closes out the practical bits: how existing rows get their initial codes (the trickiest part — codes are `NOT NULL` and immutable per Round 1), what the API exposes for code-based lookups, what seed data ships, how BDD covers the change, and the order of work within the single PR.

### Q4.1 — Backfill strategy for existing rows

There are 8 tables that already have rows in dev, staging, and any user's `seed:sample` data. The migration adds a `NOT NULL` column — what code do existing rows get?

- [x] **In-migration backfill: `UPDATE <table> SET code = '<entity_prefix>_' || substr(id::text, 1, 8)` (e.g. `value_a1b2c3d4`), then `ALTER COLUMN code SET NOT NULL`** — guaranteed unique (uuid prefix is unique enough at our scale), guaranteed snake_case, no name-derived collisions; users can rename rows later by recreating them.
- [ ] **In-migration backfill from name using the shared slugify helper, then resolve collisions with `_2`, `_3` suffixes** — readable codes from day one, but: (a) the migration has to embed/port the slugify logic into raw SQL or run the Node app, (b) name → empty (e.g. all-numeric names) needs a fallback anyway, (c) it bakes a particular sanitisation into history.
- [ ] **Two-step: ship migration with column as nullable + a follow-up code-cleanup task in the admin UI, then a second migration enforces NOT NULL** — safer rollout, but contradicts Round 1's "required, immutable, single PR" decision and leaves a window where the invariant doesn't hold.
- [ ] **Truncate-and-reseed for dev/staging; require manual UPDATE in any prod-like DB before running the migration** — clean, but `seed:sample` already deletes via `--reset`; for any non-throwaway DB it's a manual step we shouldn't force.

**Answer:**

### Q4.2 — API surface — lookup-by-code endpoint

For each entity, do we add `GET /<entity>/by-code/:code` (or similar)?

- [x] **Yes, add `GET /<entity>/by-code/:code` for all eight entities, mirroring `GET /<entity>/:id`** — symmetrical, makes "use the code as a stable reference from scripts/seeds" actually convenient; matches the existing pattern where `Geography` is looked up by both id and (implicit) code in services.
- [ ] **No — `GET /<entity>?code=...&limit=1` is good enough** — fewer endpoints, but every consumer has to unwrap a paginated list and 404-handling is awkward (empty list vs 404).
- [ ] **Add it only for the entities most likely to be referenced externally (`Value`, `ValueStream`, `Taxonomy`)** — saves five endpoints; arbitrary cut, and we'd inevitably want it on the others within a sprint.

**Answer:**

### Q4.3 — Response shape — include `code` everywhere it appears?

`code` is part of the entity. Which responses include it?

- [x] **All eight entities' list and detail responses include `code`; nested references (e.g. a `Value` embedded in a `ValueInstance` response) include the code too** — consistent, predictable, and necessary for the global-search result rendering (Q3.6) to display codes alongside matched names.
- [ ] **Only top-level responses include `code`; nested references stay as `{ id, name }`** — smaller payloads, but means the UI has to refetch to display a code anywhere it shows a related-entity badge.
- [ ] **Add `code` to top-level responses only for v1; expand nested usage in a follow-up** — incremental, but the cost of widening the response is trivial; deferring is purely cosmetic.

**Answer:**

### Q4.4 — Seed data codes

The `seed:sample` command creates demo `Value`s, `ValueStream`s, `Taxonomy`s, etc. What codes do they ship with?

- [x] **Hand-curated, descriptive codes in each seeder (e.g. `revenue_subscription`, `cogs_hosting`, `marketing_email`)** — seed data is the user's first impression and the canonical place to demonstrate "meaningful codes" — makes the feature feel real; small one-time effort.
- [ ] **Use the same slugify helper to derive codes from seeded names automatically** — less work, but codes become an afterthought instead of intentional examples; also non-trivial because some seeded names are reused across seeders.
- [ ] **Use the same uuid-prefix scheme as Q4.1 backfill (`value_a1b2c3d4`)** — uniform with migrated data, but undersells the feature in the demo UX.

**Answer:**

### Q4.5 — BDD coverage shape

How is the change tested across `packages/bdd/features/` and `apps/api/test/`?

- [ ] **One shared `.feature` describing the code contract abstractly (validation, uniqueness, immutability, by-code lookup) + per-entity *Scenario Outline* using the entity name as a parameter — each entity's existing step file imports a shared "code steps" helper** — DRY, single source of truth for the contract, eight short additions to existing step files; ~5–8 new scenarios per entity.
- [ ] **Copy-paste a per-entity feature file (`values-codes.feature`, `taxonomies-codes.feature`, …) with the same scenarios** — eight near-identical files; doubles the maintenance surface for zero benefit beyond "less indirection".
- [x] **Append a few `code`-aware scenarios to each entity's existing `create-*.feature` and `update-*.feature`** — minimum surface area, but no central place to read "what's the code contract?"; future readers have to grep eight directories.

**Answer:**

### Q4.6 — Delivery plan / order of work within the single PR

The PR will be sizable. What order minimises rework?

- [x] **(1) Shared package: Zod schema for `code`, slugify helper, types; (2) one migration adding the column + UNIQUE + tsvector update + backfill across all 8 tables; (3) entity by entity (entity → DTO → service → controller → BDD), starting with `Value`; (4) seed data; (5) Web UI per entity (badge + column + form auto-fill); (6) template sync** — bottom-up, each step verifiable in isolation; `pnpm test:e2e` is green at the end of each entity in step 3.
- [ ] **One commit per concern (all migrations together, all schemas together, all controllers together, all UI together)** — symmetrical but hard to verify mid-stream — the first commit leaves the system uncompilable.
- [ ] **One commit per entity (everything for `Value` in one commit, then `Taxonomy`, …)** — clean per-entity history, but the shared schema/helper would have to be duplicated across commits or have a separate prelude commit anyway.

**Answer:**
