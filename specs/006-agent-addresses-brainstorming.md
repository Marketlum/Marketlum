# 006 — Agent Addresses

> **Goal:** Let each Agent carry multiple postal addresses, with the country field resolved against the existing `Geography` tree.

> **Process:** Append-only. We add one round per turn; you reply by moving `[x]` to the option you want and/or writing free-form text after `**Answer:**`. Existing content is never rewritten.

## Context

Today, `Agent` (`packages/core/src/agents/entities/agent.entity.ts`) holds only `name`, `type`, `purpose`, `mainTaxonomy`, `taxonomies`, and `image`. There is no place to store where the agent is based, where to bill it, where to ship to, etc.

`Geography` (`packages/core/src/geographies/geography.entity.ts`) is a closure-table tree with a `type` enum:

```
GeographyType: planet → continent → continental_section → country → region → city → district
```

So a country is already a first-class entity with a stable id. An address's `country` should be a foreign key into `geographies` (constrained — directly or by convention — to `type='country'`).

```
   ┌──────────┐     1..N    ┌────────────┐    N..1   ┌────────────┐
   │  Agent   │────────────▶│  Address   │──────────▶│ Geography  │
   └──────────┘             └────────────┘           │ (country)  │
                                                     └────────────┘
```

Open shape questions: separate entity vs JSON column; primary-address flag; label/kind; whether the rest of the address (region/city) is also a Geography reference or free text.

Existing agent BDD coverage lives at `packages/bdd/features/agents/` (8 scenarios); geography coverage at `packages/bdd/features/geographies/` (5 scenarios). Web-admin agent pages re-export from `@marketlum/ui` — `packages/ui/src/pages/admin/agent-detail-page.tsx` is where addresses will surface.

---

## Round 1 — Foundations

Settles the storage shape and the cardinality / ownership rules before we get into fields.

### Q1.1 — Storage model

How do we represent addresses in the schema?

- [x] **Separate `addresses` table with FK `agentId`** — relational, queryable (e.g. "all agents in Poland"), cascade-deletable; matches every other 1..N relation in the codebase.
- [ ] **JSONB column `addresses` on `agents`** — fewer tables, but you lose the country FK (can't constrain or join cleanly) and have to hand-roll validation.
- [ ] **Polymorphic `addresses` table** — generic owner (agent today, customer/site tomorrow); premature given there is only one owner type in scope.

**Answer:**

### Q1.2 — Cardinality

Can an agent exist without an address?

- [x] **0..N (addresses are optional)** — most virtual/individual agents won't have one; matches today's data shape where every agent is already valid.
- [ ] **1..N (every agent must have at least one)** — forces UX friction during agent creation and breaks the seeded `AutoFlow Bot` / individual freelancers.
- [ ] **Exactly 0 or 1 (single optional address)** — defeats the purpose of the feature (the user explicitly asked for "multiple").

**Answer:**

### Q1.3 — Primary-address marker

Do we need to designate one address as the primary / default for the agent?

- [x] **Yes, one nullable `primaryAddressId` on `agent` (or `isPrimary` boolean on address with a partial unique index)** — needed the moment something downstream (invoice export, agent card) has to pick "the" address; cheap to add now.
- [ ] **No, order in the array is enough** — works if we always show all addresses, but breaks the second something needs to render one.
- [ ] **No, leave it for later** — easy to bolt on, but means a follow-up migration and rendering ambiguity in v1 UI.

**Answer:**

### Q1.4 — Country reference scope

`Address.country` should reference what, exactly?

- [x] **A `Geography` row with `type='country'`, enforced in the service layer** — clean FK to `geographies(id)`, with a runtime check rejecting non-country types; reuses existing data without a new table.
- [ ] **A `Geography` row of any type** — flexible (city-only agents), but lets you save nonsense like "country = North America"; hurts reporting.
- [ ] **A free-text country code (ISO-3166-1 alpha-2)** — no FK, no joins, no consistency with the existing geography tree.

**Answer:**

### Q1.5 — Deletion behaviour

What happens when…

- [x] **Agent deleted → addresses cascade-delete; Country deleted → block with FK error (RESTRICT)** — addresses are owned by the agent; deleting a country is rare and should be deliberate (the BDD `delete-geography` already gates on tree usage).
- [ ] **Agent deleted → cascade; Country deleted → set address.countryId to NULL** — preserves address rows but leaves them stranded with no country.
- [ ] **Agent deleted → set agentId to NULL** — leaves orphan address rows referencing nothing, no use case for this.

**Answer:**

### Q1.6 — Where addresses are exposed in the API

How are addresses transported?

- [ ] **Embedded in `AgentResponse.addresses[]` for reads; managed via PATCH `/agents/:id` (full replace of the array, like `taxonomyIds` today)** — one round-trip per agent, consistent with the existing pattern, no new endpoint surface.
- [x] **Embedded for reads, but managed via nested endpoints `POST/PATCH/DELETE /agents/:id/addresses[/...]`** — more granular and RESTful, but adds 3+ endpoints, 3+ DTOs, 3+ feature files.
- [ ] **Top-level `/addresses` CRUD with `agentId` filter** — useful only if addresses become shared across owners, which Q1.1 rules out.

**Answer:**

---

## Round 2 — Shape

Now that the storage and API shape are settled, we nail down what an address actually contains, how strictly we validate it, and what "primary" means when there are zero or many addresses.

### Q2.1 — Fields on `Address`

Which fields make the cut for v1?

A canonical international-mailing form looks roughly like this:

```
┌─ Address ───────────────────────────────────────────┐
│ label          ▢ HQ                                  │
│ line1          [ 123 Market Street          ]        │
│ line2          [ Suite 400 (optional)       ]        │
│ city           [ San Francisco              ]        │
│ region         [ CA (optional)              ]        │
│ postalCode     [ 94103                      ]        │
│ country        [ United States ▾ ]   (Geography FK)  │
└──────────────────────────────────────────────────────┘
```

- [x] **`label?`, `line1`, `line2?`, `city`, `region?`, `postalCode`, `countryId`** — covers global mailing conventions; `region`/`line2` optional because they don't apply universally; `label` is the user-facing free-text discriminator (more in Q2.2).
- [ ] **Same as above, plus `recipient?` and `phone?`** — sometimes useful for shipping/billing, but neither was requested and both add validation/PII surface; defer to a follow-up.
- [ ] **Minimal: `line1`, `city`, `countryId`** — least friction, but missing `postalCode` / `region` makes the address useless for most printed forms.
- [ ] **Single-textarea `body` plus `countryId`** — easy to type, impossible to render structured (e.g. on an invoice template).

**Answer:**

### Q2.2 — Address label / kind

How do we distinguish an agent's multiple addresses ("billing" vs "shipping" vs "office")?

- [x] **Free-text `label` (optional, max 50 chars)** — flexible, no migrations to add new categories, mirrors how `purpose` works on the Agent itself; ordering is on user.
- [ ] **Enum `kind: 'billing' | 'shipping' | 'hq' | 'mailing' | 'other'`** — drives consistent UI badges and filtering, but adds an enum migration every time someone needs a new bucket, and you still want a free-text label for "Warsaw office #2".
- [ ] **Both: required `kind` enum + optional `label`** — most explicit, most validation, most translations; overkill until something else (export, invoice template) actually keys off `kind`.
- [ ] **Neither — order in the array is the only differentiator** — saves a column at the cost of a confusing UI ("Address 1, Address 2…").

**Answer:**

### Q2.3 — City and region: free text or Geography refs?

`country` is a Geography FK (Q1.4). What about the rest?

- [x] **`city` and `region` are free text** — keeps the form snappy, doesn't force admins to pre-seed every city/region; we still get country-level reporting from the FK.
- [ ] **`city` is a Geography FK (`type='city'`), `region` is free text** — nice for analytics, but requires a city to exist in `geographies` before you can save an address, which is a real friction wall for non-US/EU markets.
- [ ] **Both are Geography FKs** — maximally normalised; impractical without an autocomplete that creates Geography rows on the fly.

**Answer:**

### Q2.4 — Validation

How strict are we on field shapes?

- [x] **Lengths only: `line1/line2/city/region/label` ≤ 255, `postalCode` ≤ 20; trim; `countryId` is a UUID. No regex per country.** — matches every other entity's validation in `@marketlum/shared`; postal-code rules vary per country and would belong in a country-specific lookup, which we don't have.
- [ ] **Add postal-code regex per country (UK, US, PL, …)** — better data quality, but a fragile maintenance burden and inconsistent with the rest of the codebase.
- [ ] **Add a Zod `superRefine` that rejects empty addresses (every field blank)** — well-intended but redundant: `line1` is already required.

**Answer:**

### Q2.5 — "Primary" semantics

Given Q1.3 picked primary-address tracking, what's the rule?

- [x] **At most one primary per agent. Auto-promote: if no address is flagged primary, the most-recently-created one is treated as primary at the API boundary; setting `isPrimary=true` clears the flag on any sibling.** — guarantees the UI always has "an" address to render without forcing the user to click anything, and avoids a multi-primary inconsistency.
- [ ] **Exactly one primary required whenever ≥1 address exists** — clean invariant, but pushes complexity into the create/delete flows ("which one becomes primary now?").
- [ ] **Free-form: any number of `isPrimary=true` rows** — defeats the purpose; downstream code can't pick one without tie-breaking.
- [ ] **No flag on the row; store `primaryAddressId` on `Agent` instead** — pushes the FK onto agent (with `ON DELETE SET NULL`); cleaner in writes but every list query has to second-join to render the primary.

**Answer:**

### Q2.6 — Ordering

How are an agent's addresses sorted in API responses and UI?

- [x] **Primary first, then by `createdAt` ASC** — stable, predictable, no extra `sortOrder` column to maintain.
- [ ] **Explicit `sortOrder` integer the user can drag-reorder** — nice power-user feature, but adds a column, a re-order endpoint, and drag-handle UI work for v1.
- [ ] **`createdAt` ASC only** — simplest, but the primary can end up buried; conflicts with Q2.5's intent.

**Answer:**

---

## Round 3 — UI / UX

We have an entity and an API. Now: where does it surface in the admin, what does adding/editing feel like, and how do addresses show up in lists.

### Q3.1 — Where in the agent detail page

The agent detail page already has tabs (Overview / Values today). Where do addresses live?

```
┌──────────────────────────────────────────────────────────┐
│  Agent: Acme Corp                                         │
│  [ Overview ]  [ Values ]  [ Addresses (3) ]   ← option A│
│  ───────────────────────────────────────────────         │
│                                                          │
│  Or under Overview as a "card":          ← option B      │
│  ┌─ Addresses ─────────────────────────────┐             │
│  │ ★ HQ — Warsaw, Poland                   │             │
│  │   Berlin office — Berlin, Germany       │             │
│  └─────────────────────────────────────────┘             │
└──────────────────────────────────────────────────────────┘
```

- [x] **Dedicated tab "Addresses" with count badge** — mirrors how Values and other 1..N relations are surfaced; keeps Overview uncluttered; gives addresses room to grow (filters, export).
- [ ] **Inline card on the Overview tab** — addresses are visible by default; works only while we have a small number; gets awkward at 5+ addresses.
- [ ] **Linked sub-page `/admin/agents/[id]/addresses`** — heaviest option; consistent with value-streams sections but unnecessary for what is usually a list of <10 rows.

**Answer:**

### Q3.2 — Add / edit / delete affordances

How does the admin actually CRUD an address?

- [x] **Right-side `Sheet` form (same component family used for invoices), one address per sheet, opened by an "Add address" button on the tab and a row-level "Edit" / "Delete" action menu** — consistent with the new invoice form pattern, gives the form room to breathe, supports the Geography combobox at full width.
- [ ] **Modal `Dialog` form per address** — same UX semantics as the Sheet, but tighter; we've been moving the other way (invoice form just shipped Dialog→Sheet).
- [ ] **Inline editable rows (click to edit in place)** — fastest power-user UX, but means writing inline state management, autosave, and per-field validation rendering; significant scope.

**Answer:**

### Q3.3 — Country picker

`countryId` is a Geography FK constrained to `type='country'`. What does the form control look like?

- [x] **A new `<CountryCombobox>` (search-as-you-type) hitting `GET /geographies?type=country&limit=500`** — handles the ~250 countries comfortably, plays well with keyboard; we already have a `ValueCombobox` to crib from.
- [ ] **A plain `<Select>` listing every country** — fine for ≤100 entries; with the closure-table tree fully seeded this turns into a long unwieldy dropdown.
- [ ] **A taxonomy-tree-style picker reusing `TaxonomyTreeSelect` against the Geography tree** — overkill for "pick a country", and surfaces continents/regions the user doesn't want.

**Answer:**

### Q3.4 — Row display

How does a single address render on the Addresses tab?

```
┌───────────────────────────────────────────────────────────┐
│ ★ HQ                                              [⋯ menu]│
│   ul. Marszałkowska 1                                     │
│   00-001 Warszawa  Poland                                 │
└───────────────────────────────────────────────────────────┘
```

- [x] **Card-per-row with star/badge for primary, label (if any) bold, multi-line address body, "…" menu for Edit/Delete/Make primary** — scannable, mirrors how other entities present 1..N rows (Values table is wider but follows the same idea).
- [ ] **Tabular: columns Label · Line1 · City · Country · Primary · Actions** — denser, but address lines wrap awkwardly and tables look ugly with optional fields scattered as nulls.
- [ ] **Pure JSON dump in a `<pre>`** — funny, not useful.

**Answer:**

### Q3.5 — Agents list page

Should the addresses surface anywhere on the agents list (`/admin/agents`)?

- [ ] **Add a single "Primary address" cell showing `city, country` (e.g. "Warsaw, Poland") with em-dash for empty** — one extra column, useful at a glance, no clutter.
- [ ] **Add separate columns for City and Country** — more sortable/filterable but takes two columns for what's effectively one piece of info.
- [x] **Don't surface anything on the list page** — keeps the list tidy; addresses live only on the detail page.

**Answer:**

### Q3.6 — Empty state

When an agent has zero addresses on its Addresses tab, we show:

- [x] **An empty-state card: icon + "No addresses yet" + a `+ Add address` button** — consistent with how other empty 1..N tabs render in the admin.
- [ ] **The form, pre-opened, with all fields empty** — saves one click but doubles as a half-completed-state pitfall if the user navigates away.
- [ ] **Nothing — just the toolbar with the Add button** — minimal, but feels broken to first-time users.

**Answer:**

---

## Round 4 — Integration, security, delivery

Last round. We close out the dependencies on neighbouring modules (the countries endpoint, permissions, seed data), and stake out the test / migration / PR shape.

### Q4.1 — How does the UI fetch the country list?

The `/geographies` controller today exposes `/tree`, `/roots`, `/:id`, `/:id/children` — but no flat filterable list. The `<CountryCombobox>` needs one.

- [x] **Add `GET /geographies?type=<type>&search=<q>` (paginated, default `limit=500`)** — reusable for any future "pick a city / region" feature, keeps Geography as the single source, no new module.
- [ ] **Add a dedicated `GET /geographies/countries` endpoint that always returns all countries sorted by name** — narrower and more explicit, but bakes the "countries" abstraction into the API forever and gets in the way the moment we need cities.
- [ ] **Use existing `GET /geographies/tree` and filter to `type='country'` client-side** — zero backend work, but ships the whole geography tree (potentially thousands of rows) on every form mount.

**Answer:**

### Q4.2 — Permissions

- [x] **All address endpoints behind `AdminGuard`, applied at the `AgentsController` level (the nested routes inherit it)** — same posture as every other admin-managed entity in the codebase; no end-user write path here.
- [ ] **Use a finer-grained guard / role check** — no current role beyond admin, no reason to invent one.

**Answer:**

### Q4.3 — Seed data

Should `pnpm seed:sample` populate addresses?

- [x] **Yes: give each of the 3 sample organizations 1–2 addresses with realistic data (Poland HQ + sometimes a Berlin/London office), individuals/virtual agents stay address-less** — keeps the sample fixtures realistic and exercises the country FK in tests we run locally.
- [ ] **Yes, but only the 3 organizations get exactly one HQ address each** — simpler seed, but doesn't exercise the multi-address case in dev.
- [ ] **No, leave seed alone; addresses are admin-entered** — least churn, but the moment someone opens an agent detail page in a dev env it's empty.

**Answer:**

### Q4.4 — Filtering agents by country

Does the agents list need a "filter by country" affordance?

- [x] **Not in this PR** — Q3.5 already kept the list page clean; out of scope; defer until a real query need shows up.
- [ ] **Yes, add `?countryId=` to `GET /agents` and a country dropdown filter on the list page** — useful for reporting; but it expands the PR (controller, service, web filter UI, BDD).
- [ ] **Yes, but as a generic search hit (so typing "Poland" matches both name and country)** — clever but conflates semantics; agents-by-country deserves its own filter chip when added.

**Answer:**

### Q4.5 — BDD coverage

Strict BDD is the project rule. What's the scope?

Proposed feature files under `packages/bdd/features/agent-addresses/`:

| File | Scenarios |
|---|---|
| `create-address.feature` | happy path, validation (line1 required), unknown agent, non-country geography rejected | 4 |
| `update-address.feature` | edit fields, set/unset primary, validation, unknown ids | 4 |
| `delete-address.feature` | delete an address, delete primary (most-recent sibling auto-promotes) | 2 |
| `list-addresses.feature` | empty, single, multiple ordered (primary first then createdAt) | 3 |
| `agent-addresses-embedded.feature` | `GET /agents/:id` returns embedded sorted addresses with country summary | 2 |
| `cascade-delete-on-agent.feature` | deleting an agent cascade-deletes addresses | 1 |

Plus an extension to `packages/bdd/features/geographies/`:

| File | Scenarios |
|---|---|
| `list-geographies-filter.feature` (new) | filter by `type=country`; search by name | 2 |

- [x] **Full BDD coverage (~18 scenarios) — the table above** — matches the project's BDD posture and the granular nested API; covers happy path + validation + cascade + ordering.
- [ ] **Slim coverage: only `create-address`, `delete-address`, `list-addresses` (≈8 scenarios)** — saves time, but leaves primary-flag semantics and cascade behaviour uncovered.
- [ ] **No new BDD; rely on existing manual tests** — violates the project's strict-BDD policy.

**Answer:**

### Q4.6 — Migration strategy

- [x] **One hand-written migration that adds the `addresses` table (with FK + ON DELETE CASCADE to `agents`, FK + ON DELETE RESTRICT to `geographies`, partial unique index `WHERE "isPrimary" IS TRUE` on `agentId`)** — cleanest single artifact; manual write avoids the "drift artefacts" gotcha noted in `MEMORY.md`.
- [ ] **Two migrations (table first, indices second)** — no benefit; just splits a single atomic change.
- [ ] **`migration:generate` and live with whatever TypeORM emits** — risks dragging in unrelated enum/index renames from drift.

**Answer:**

### Q4.7 — Delivery (PR shape)

- [x] **Single PR — entity + migration + nested controller + Geography list endpoint + CountryCombobox + Addresses tab + BDD + seed update + template sync** — the surface is contained and the BDD coverage validates the whole flow end-to-end.
- [ ] **Two PRs: (PR1) backend + migration + BDD; (PR2) web/UI tab + combobox** — useful if backend can ship and be used by something else first, but here there's no consumer yet.
- [ ] **Three PRs: (PR1) Geography list endpoint, (PR2) addresses CRUD + BDD, (PR3) UI** — over-fractured for a feature this small.

**Answer:**
