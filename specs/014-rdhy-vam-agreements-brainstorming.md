# 014 — RDHY Plugin: VAM Agreements (Brainstorming)

> **Goal:** Model Chaordian's VAM (Value Adjustment Mechanism) Canvas as a plugin-owned aggregate in `@marketlum/plugin-rdhy`: a per-micro-enterprise agreement over a time horizon with a value co-creation grid (inflection points × value/reward tracks), lifecycle management (sponsoring platform, termination conditions), operating costs and investments.

> **Process:** Structured Q&A in rounds. Each question offers mutually-exclusive options; the recommended one is preselected with `[x]`. Move the `[x]` to override, and/or write below the `**Answer:**` line. This file is append-only — new rounds are added at the bottom, existing content is never edited.

## Context

**What exists today:**

- **RDHY plugin (spec 013, shipped):** `RdhyPlatform` (`plugin_rdhy_platforms`) and one-platform-per-value-stream membership (`plugin_rdhy_platform_value_streams`). Endpoints under `/plugins/rdhy`, "RenDanHeYi" nav group with list + detail pages, dynamic-segment plugin routes (`platforms/:id`), plugin seed hook wired into `seed:sample`.
- **Plugin discipline (spec 012):** plugin-owned `plugin_rdhy_*` tables only; one-way FKs to core; DB-level cascades; core is never modified. `primaryEntities` emit `marketlum.plugin.rdhy.<entity_snake>.*` events (join/child entities skipped). Validation via Zod + `ZodValidationPipe` (400 on invalid body), duplicate codes → 409, `AdminGuard` on all controllers.
- **Core conventions available for reuse:** money columns are `decimal(14,4)` amount + nullable `currencyId → values(id)` (recurring flows, invoices); core also has its own `agreements`/`agreement_templates` domain (separate from RDHY); `codeSchema` for snake_case codes.
- **Spec 012 §8.1 sketch (never built):** `MicroEnterprise` (`kind: MARKET_ME | NODE_ME | PLATFORM_ME`) and `EmcAgreement` (`status: DRAFT | ACTIVE | CLOSED`) were the planned RDHY starter entities; spec 013 chose platforms + VS membership instead.

**The source canvas** (VAM Canvas, Chaordian / Boundaryless, CC BY-SA 4.0), by section:

```
┌─ VALUE CO-CREATION AND SHARING ────────────────────────────────────────────┐
│ TIMING (inflection points: 3m, 6m, 9m, 12m…)  ×  five tracks:              │
│   DIRECT VALUE | INDIRECT VALUE | VARIABLE PAY | PROFIT SHARING | EQUITY   │
│   e.g. "First $500K of revenues delivered" (direct, 9m),                   │
│        "$50K bonus for owners" (variable pay, 6m),                         │
│        "10% profit sharing for the team" (profit, 12m)                     │
├─ LIFECYCLE MANAGEMENT ─────────────────────────────────────────────────────┤
│ INDUSTRY PLATFORM (sponsor investing in the micro-node)                    │
│ TERMINATION CONDITIONS (free-text rules, e.g. "terminated if leading      │
│   goals missed by more than 15%")                                          │
├─ OPERATING COSTS ──────────────────────────────────────────────────────────┤
│ SHARED SERVICE PLATFORMS | NODE MICRO-ENTERPRISES | EXTERNAL NODES |       │
│ PARTICIPATION TO EMCs | LEADERS SALARY | TEAM SALARY                       │
│   each: label + amount (+ headcount for salary rows)                       │
├─ INVESTMENTS ──────────────────────────────────────────────────────────────┤
│ CAPITAL INVESTMENT | PRE-ALLOCATED BUDGET (allowances: team /             │
│   internal services / external services)                                   │
└────────────────────────────────────────────────────────────────────────────┘
```

**Proposed aggregate (starting point for discussion):** `RdhyVamAgreement` (anchor + sponsor + horizon + status + termination rules + investments) with children `RdhyVamMilestone` (timing rows), `RdhyVamItem` (milestone × track cells), `RdhyVamCostEntry` (operating-cost rows).

---

## Round 1 — Foundations

The anchoring, scope, and lifecycle decisions everything else hangs on.

### Q1. Anchor entity — who is the VAM agreement *about*?

The canvas is written for a micro-enterprise ("Web 3 Consulting HUB"). Marketlum's RDHY plugin currently treats core value streams as the platform-hosted units.

- [x] **Core `ValueStream`** — `RdhyVamAgreement.valueStreamId → value_streams(id)`. Continues spec 013's stance (VS ≈ micro-enterprise), reuses the existing membership/UX vocabulary, and needs no new entity. `MicroEnterprise` can still arrive later and take over as anchor in a migration.
- [ ] **Introduce `MicroEnterprise` first** — build the spec 012 §8.1 entity now and anchor VAMs to it. Domain-faithful (canvas speaks micro-enterprise), but doubles the slice: a whole new entity + its relationship to value streams before any VAM work starts.
- [ ] **The platform membership link** — anchor to the `plugin_rdhy_platform_value_streams` row. Guarantees the VS is on a platform, but couples an agreement's lifetime to membership (reassigning a VS would orphan its VAM) and makes the sponsor redundant.

**Answer:**

### Q2. Scope — plan only, or plan + achievement?

The canvas is a *plan*. VAM's mechanism (rewards unlock when value is delivered) implies tracking achievement eventually.

- [ ] **Plan + achieved flags** — every `RdhyVamItem` (and milestone) carries a manually-toggled `achievedAt` timestamp; the UI shows plan vs. achieved. No computation, no automation — but the agreement is already usable as a living document, and reward logic can build on the flags later.
- [x] **Plan only** — pure canvas authoring; achievement tracking is spec 015. Smallest slice, but ships a static document with no mechanism at all.
- [ ] **Plan + reward computation** — achieved items trigger computed payouts/rollups against cost & investment envelopes. The "real" VAM, but requires settling payout semantics, currency conversion and actuals sourcing — far more than one slice.

**Answer:**

### Q3. Cardinality per value stream

- [x] **One ACTIVE per value stream** — any number of DRAFT/COMPLETED/TERMINATED agreements, but activation is rejected (409) while another ACTIVE one exists for the same VS. Matches "the VAM" being the current operating contract, while preserving history and renewal drafts.
- [ ] **Unlimited** — no constraint; multiple concurrent ACTIVE VAMs allowed. Simplest, but "which contract governs?" becomes ambiguous for any future reward logic.
- [ ] **Strictly one ever (unique FK)** — one row per VS, edited in place. Simplest schema, but destroys history and renewal workflows.

**Answer:**

### Q4. Relationship to core `agreements`

Core already has an Agreements domain (agents ↔ agreement templates).

- [ ] **Fully separate** — VAM agreements are plugin-owned with no link to core `agreements`. Different parties (platform ↔ micro-enterprise vs. agent ↔ agent), different shape; entangling them buys nothing and couples the plugin to core internals.
- [x] **Optional link** — nullable `agreementId → agreements(id)` for deployments that mirror VAMs as legal agreements. Cheap to add, but speculative; nobody asked for it.
- [ ] **Build on core agreements** — represent the VAM as a core agreement with plugin extensions. Violates the "plugins don't extend core" rule in spirit and shoehorns a canvas into a template model.

**Answer:**

### Q5. Sponsoring platform — required, and constrained to membership?

The canvas's "Industry Platform" box names the platform investing in the micro-node. Spec 013 already tracks which platform *hosts* each VS.

- [x] **Required FK, no membership constraint** — `platformId → plugin_rdhy_platforms(id)` NOT NULL. The sponsor is intrinsic to a VAM (it authorizes the pre-allocated budget), but it may legitimately differ from the hosting platform, so no cross-check against the membership table.
- [ ] **Required + must be the hosting platform** — validated at create/activate time. Tighter integrity, but blocks real cases (a shared-services VS sponsored by an industry platform) and adds a coupling that's hard to relax later.
- [ ] **Optional FK** — sponsor can be null. Maximally flexible, but a VAM without a sponsor contradicts the canvas (someone must grant the investment/budget).

**Answer:**

### Q6. Status lifecycle

- [x] **`DRAFT → ACTIVE → COMPLETED | TERMINATED`, guarded transitions** — full editing only in DRAFT; ACTIVE allows achievement toggles (and additive tweaks per Round 2); COMPLETED/TERMINATED are terminal. Transitions via explicit endpoints (`/activate`, `/complete`, `/terminate`), echoing the spec 012 `EmcAgreement` status sketch.
- [ ] **Free status field** — an enum column changed via plain PATCH, no transition rules. Less code, but "un-terminating" an agreement by PATCH undermines the contract semantics.
- [ ] **No status in slice one** — every agreement is implicitly a draft. Simplest, but Q3's "one ACTIVE per VS" and any achievement semantics need the state machine anyway.

**Answer:**

### Q7. Termination conditions — representation

- [x] **Ordered free-text rules** — `terminationConditions: text[]` (or child rows) authored as plain sentences, exactly like the canvas. Terminating requires citing which rule applies (stored on the agreement). No structured rule engine.
- [ ] **Structured conditions** — typed rules (metric, threshold, window) that could later be evaluated automatically. Powerful, but invents a rules DSL long before anything can evaluate it.
- [ ] **Single free-text blob** — one `text` column. Fewer moving parts, but loses the "cite rule N on termination" affordance and list-style canvas authoring.

**Answer:**

---

## Round 2 — Shape

Round 1 locked: ValueStream anchor, plan-only scope (tracking = spec 015), one ACTIVE per VS, optional core-agreement link, required sponsor platform, guarded lifecycle, free-text termination rules. This round shapes the canvas data itself.

### Q8. Milestones (the canvas timing rows)

- [x] **Offset months** — `RdhyVamMilestone.offsetMonths: int` (3, 6, 9, 12…), unique per agreement, plus an optional label. The agreement stores `horizonMonths` and, once activated, `startedAt` — concrete dates are derived, so drafts written before a start date exists stay valid (exactly how the canvas is authored).
- [ ] **Absolute dates** — each milestone carries a date. More concrete, but forces dates onto drafts and breaks the "12-month template" reading of the canvas.
- [ ] **Free-text labels only** — milestones are just named columns with no temporal meaning. Simplest, but throws away ordering/derivation and spec 015 would have to retrofit time.

**Answer:**

### Q9. Value/reward items (the grid cells)

Canvas cells mix qualitative ("All offerings prepared"), monetary ("First $500K of revenues"), and percentage ("10% profit sharing") statements.

- [x] **Description + optional amount** — `description` required; optional `amount decimal(14,4)` for cells with a clear monetary value. Percentages and qualitative content live in the description text. Keeps authoring free-form like the canvas while making money aggregatable where it exists.
- [ ] **Description only** — amounts stay embedded in text. Simplest, but spec 015 (tracking/rollups) would have nothing numeric to work with.
- [ ] **Typed items** — discriminated union (qualitative / monetary / percentage) with structured fields per type. Cleaner data, but heavy authoring UX for a plan document and most cells are prose anyway.

**Answer:**

### Q10. Track representation

- [x] **Fixed five-track enum** — `DIRECT_VALUE | INDIRECT_VALUE | VARIABLE_PAY | PROFIT_SHARING | EQUITY`, mirroring the canvas columns 1:1. The canvas is a standard; custom tracks would break the shared vocabulary (and the canvas-style UI grid).
- [ ] **Two groups + subtype** — `VALUE (direct/indirect)` vs `REWARD (variable pay/profit/equity)`. Adds a grouping the UI can derive from the enum anyway.
- [ ] **Extensible tracks** — enum plus user-defined tracks. Flexibility nobody asked for; complicates every grid render.

**Answer:**

### Q11. Operating costs

- [x] **Category enum + label + amount + optional headcount** — `RdhyVamCostEntry(category: SHARED_SERVICE_PLATFORMS | NODE_MICRO_ENTERPRISES | EXTERNAL_NODES | EMC_PARTICIPATION | LEADERS_SALARY | TEAM_SALARY, label, amount, headcount?)`. Headcount covers "1 leader $50K" / "3 team members $90K"; multiple entries per category allowed.
- [ ] **Free-text category** — a string instead of the enum. Avoids a migration if the canvas evolves, but loses grouping/rollups and invites typos.
- [ ] **Defer costs** — value grid only in slice one. Smaller, but costs and investments are half the canvas; the document would feel amputated.

**Answer:**

### Q12. Investments

- [x] **Investment entries child table** — `RdhyVamInvestmentEntry(kind: CAPITAL_INVESTMENT | TEAM_ALLOWANCE | INTERNAL_SERVICES_ALLOWANCE | EXTERNAL_SERVICES_ALLOWANCE, label?, amount)`. Uniform with cost entries, allows several capital lines or extra allowances, keeps the agreement row lean.
- [ ] **Fixed columns on the agreement** — `capitalInvestmentAmount` + three allowance columns. Fewer joins, but caps each section at one line and bloats the agreement row.
- [ ] **Merge into the cost table** — one entries table with a `section` discriminator (`OPERATING_COSTS` / `INVESTMENTS`) and a combined category enum. One table fewer, but two orthogonal enums squeezed into one column gets awkward in validation and UI.

**Answer:**

### Q13. Currency

The canvas is written in a single currency ($) throughout.

- [x] **One currency per agreement** — optional `currencyId → values(id)` on `RdhyVamAgreement`; all child amounts are plain decimals in that currency. Matches how a canvas is actually written; per-entry currency can be added later if a real need appears.
- [ ] **Per-entry currency FK** — core's invoice/recurring-flow convention on every amount. Maximum fidelity to core patterns, but triples the FK surface for a document that's realistically single-currency.
- [ ] **No currency** — amounts are unitless decimals. Simplest, but ambiguous the moment two deployments mix currencies.

**Answer:**

### Q14. Editing model & per-status mutability

With plan-only scope (Q2), ACTIVE has no achievement toggles — so what can change when?

- [x] **Document-style canvas PUT, DRAFT-only** — metadata (title, VS, platform, horizon, currency, agreement link) via `PATCH` in DRAFT; the whole canvas content (milestones + items + costs + investments + termination rules) replaced transactionally via `PUT …/:id/canvas` in DRAFT, array order = display order. ACTIVE/COMPLETED/TERMINATED are read-only except the transition endpoints. One endpoint instead of four child CRUD sets, and it matches how a canvas is edited (grid → save).
- [ ] **Granular child CRUD** — separate POST/PATCH/DELETE per milestone/item/cost/investment. REST-conventional and diff-friendly, but ~16 endpoints plus ordering fields, for a document users edit as a whole.
- [ ] **Canvas PUT allowed while ACTIVE too** — same single endpoint, mutable until terminal. Convenient, but an amendable active contract undermines Q6's activation semantics; renegotiation = new draft.

**Answer:**

---

## Round 3 — Web UI & UX

Everything lives in the existing "RenDanHeYi" nav group and the plugin's page infrastructure (dynamic routes like `vam-agreements/:id` already work). Core value-stream pages remain untouchable, as in spec 013. Status-transition UX follows from Q6/Q7 and needs no question: header buttons (Activate / Complete / Terminate) with confirm dialogs, Terminate requiring the cited rule plus an optional note.

### Q15. Detail page — how is a VAM agreement rendered?

- [x] **Canvas-style read view** — the detail page renders the PDF's layout: the value co-creation grid (milestone columns × five track rows) as the centerpiece, with lifecycle, operating costs (grouped by category, with totals) and investments sections below. This is the feature's identity; plain tables would bury it.
- [ ] **Plain tables per section** — conventional tables for milestones, items, costs, investments. Cheapest to build, reuses `@marketlum/ui` tables 1:1, but reads like a database dump of a canvas.
- [ ] **Tabs: canvas + tables** — both renderings. More surface to build and maintain for marginal benefit; the grid can show everything the tables would.

**Answer:**

### Q16. Editing UX in DRAFT

The backend contract is one transactional canvas PUT (Q14) — the editor decides how that document is assembled.

- [x] **Sectioned editor** — an "Edit canvas" mode with one section per canvas area: a milestones row editor, per-milestone × per-track item lists (add/remove/edit description + amount), cost and investment entry tables, a termination-rules list. Single Save issues the canvas PUT. Reuses existing form primitives; the read view stays the pretty one.
- [ ] **Inline-editable canvas grid** — edit directly in the canvas cells. The nicest UX, but a substantial custom grid-editing component for slice one; can be layered on later over the same PUT.
- [ ] **Per-section dialogs on the read view** — small edit dialogs per section, each issuing the full PUT with one section changed. Feels granular but still sends the whole document; awkward mix of both worlds.

**Answer:**

### Q17. Entry points

- [x] **Nav item + platform detail section** — "VAM Agreements" in the RenDanHeYi group (list at `/admin/x/vam-agreements`, detail at `vam-agreements/:id`), plus a small "Sponsored VAM agreements" list on the platform detail page (the plugin owns that page, so it's cheap and matches the sponsor relationship).
- [ ] **Nav item only** — just the list/detail pages. Simplest, leaves the platform page unaware of agreements it sponsors.
- [ ] **Platform-scoped only** — agreements reachable exclusively through their sponsoring platform's page. Fewer routes, but hides the primary VAM workflow one click deeper and complicates "all agreements" oversight.

**Answer:**

### Q18. List page

- [x] **Table with status + platform filters** — columns: title, value stream, sponsor platform, status badge, horizon, updated. Client-side selects for status and platform (agreement counts grow per-VS per-cycle, unlike the small platform catalog). "New agreement" button up top.
- [ ] **Plain table, no filters** — matches the platforms list. Fine at 5 rows, noisy at 50.
- [ ] **Grouped by status** — sections for ACTIVE / DRAFT / terminal. Opinionated layout that fights sorting and scanning once lists grow.

**Answer:**

### Q19. Create flow

- [x] **Metadata dialog → detail in edit mode** — "New agreement" opens a dialog for the metadata (title, value stream picker, sponsor platform select, horizon months, optional currency); on create you land on the DRAFT detail page with the empty canvas ready to edit. Matches the platform-page pattern and keeps the dialog small.
- [ ] **Full-page create form** — metadata + canvas in one giant form before anything is saved. No draft-then-edit hop, but loses work on navigation and duplicates the editor.
- [ ] **Create from the platform page only** — "New VAM" button on the sponsor's detail page pre-filling the platform. Nice touch, but as the only entry point it hides creation; can be added later as a shortcut.

**Answer:**

---

## Round 4 — Integration, seeding, tests, delivery

Last round. Settled by precedent and not re-asked: `AdminGuard` on all controllers, Zod schemas from the plugin's `/shared` entry, BDD features in `packages/plugin-rdhy/features/` with steps in `apps/api/test/plugins/rdhy/` (the spec 013 layout), template stays lean, no core or `@marketlum/ui` changes are expected this time.

### Q20. Seed data

- [x] **One full canvas + one draft** — the seeder adds an ACTIVE "Web 3 Consulting HUB" agreement modeled on the source PDF (sponsored by `industrial_platform`, anchored to a seeded value stream: 4 milestones, ~15 grid items, 6 cost entries, 4 investment entries, 2 termination rules) plus one empty DRAFT. Demos the canvas view, the list filters, and both statuses; idempotent by title+VS like the platform seeder is by code.
- [ ] **Minimal** — one empty DRAFT only. Cheap, but the canvas read view — the centerpiece — demos blank.
- [ ] **No seed** — plugin seed hook unchanged. Least work, worst first impression.

**Answer:**

### Q21. Domain events

- [x] **Standard CRUD events only** — `RdhyVamAgreement` joins `primaryEntities` (children skipped, per convention), so created/updated/deleted fire automatically; status transitions surface as `updated`. Custom lifecycle events (`…vam_agreement.activated` etc.) wait until spec 015 gives them a consumer.
- [ ] **CRUD + custom lifecycle events** — additionally emit activated/completed/terminated. More expressive, but invents an event vocabulary nothing consumes yet and departs from the auto-subscriber pattern.
- [ ] **No events** — leave `primaryEntities` as-is. Breaks the convention that plugin primary entities emit events.

**Answer:**

### Q22. Deleting agreements

- [x] **DRAFT-only hard delete** — `DELETE` allowed in DRAFT (children cascade); ACTIVE and terminal agreements return 409 (they're contract history; an ACTIVE one must be terminated first). Mirrors the "renegotiation = new draft" stance from Q14.
- [ ] **Any status deletable** — simplest, but erases contract history with one call.
- [ ] **DRAFT + terminal deletable** — allows cleanup of old records, but quietly destroys the history Q3 preserved.

**Answer:**

### Q23. Referential behavior toward core

- [x] **Cascade on value-stream delete, SET NULL on core-agreement delete** — `valueStreamId` FK `ON DELETE CASCADE` (deleting a VS is already destructive in core; blocking it from a plugin table would make core deletes fail inexplicably — spec 013 set this precedent), `agreementId` FK `ON DELETE SET NULL` (the optional legal mirror disappearing shouldn't take the VAM with it). Sponsor `platformId` stays `RESTRICT`-free too: platform delete cascades memberships today, but agreements are contracts — platform FK gets `ON DELETE RESTRICT`? No — see options below.
- [ ] **RESTRICT on everything** — DB blocks deleting a VS/platform/agreement that a VAM references. Strongest integrity, but core delete endpoints would 500 with no idea why (core cannot know about plugin tables).
- [ ] **SET NULL on everything** — agreements survive as orphans with null anchors. Preserves rows but produces agreements about nothing.

**Answer (note: pick the platformId behavior here too — CASCADE like memberships, or RESTRICT accepting that platform deletes can fail):**

### Q24. Delivery shape

- [x] **One PR, ordered commits** — (1) feature files, (2) backend: entities, migration, module/service/controllers, schemas, seeder, (3) web slice: canvas view, editor, list, platform-page section, i18n, (4) BDD steps + green suite. Same playbook as spec 013 minus the `@marketlum/ui` commit (no core-side changes needed).
- [ ] **Two PRs (backend, then web)** — reviewable in halves, but the web half is where the canvas is judged; splitting delays the only meaningful demo.

**Answer:**
