# Value Stream Sections — Brainstorming

> **Goal:** Split the existing `/admin/value-streams/[id]` Overview page into focused sub-routes for **values, exchanges, agreements, agreement templates, and offerings**, reachable as sibling tabs to the existing Overview / Budget tabs.
>
> **Process:** One round of questions at a time. The user appends answers below each question. Existing content is never modified.

## Context

The value-stream detail route today is:

```
/admin/value-streams/[id]/
├── layout.tsx             ← Overview / Budget tab strip (spec 003)
├── page.tsx               ← Overview: header, action buttons, RevenueExpenses chart,
│                            Recent values, Recent exchanges, Recurring flows summary,
│                            Recurring flows data table, Recurring flows projection
└── budget/page.tsx        ← Budget view
```

Existing relationships to value streams:

| Entity              | `valueStreamId` FK? | Notes                                                              |
|---------------------|---------------------|--------------------------------------------------------------------|
| `Value`             | yes, nullable       | List page supports `?valueStreamId=` filter.                       |
| `Exchange`          | yes, nullable       | List page supports `?valueStreamId=` filter.                       |
| `Offering`          | yes, nullable       | List page supports `?valueStreamId=` filter.                       |
| `AgreementTemplate` | yes, nullable       | Search endpoint accepts `valueStreamId`.                            |
| `Agreement`         | **no**              | Linked to `Agent`s as parties; no direct stream FK.                |
| `RecurringFlow`     | yes, required       | Already surfaced on Overview and on the Budget page.               |

All top-level list pages (`/admin/values`, `/admin/exchanges`, etc.) already accept a `?valueStreamId=` query param. The brainstorm boils down to whether we wrap those existing tables as embedded sub-pages or build dedicated components.

```
Today                                Proposed
─────                                ────────
/admin/value-streams/[id]            /admin/value-streams/[id]
  ├─ Overview (all in one)             ├─ Overview              ← slimmed
  └─ Budget                            ├─ Values                ← NEW
                                       ├─ Offerings             ← NEW
                                       ├─ Agreement Templates   ← NEW
                                       ├─ Agreements            ← NEW (scoping TBD)
                                       ├─ Exchanges             ← NEW
                                       └─ Budget
```

---

## Round 1 &mdash; Foundations

This round nails down what stays on Overview, how the sub-pages relate to the existing global list pages, and how to scope `Agreement` (which has no direct FK to value stream).

### Q1.1 &mdash; What happens to the existing Overview tab?

- [x] **Slim it down** &mdash; keep header, RevenueExpenses chart, RecurringFlowsSummary card, and the "Create value / Create exchange" action buttons. Move the recent-values list, recent-exchanges list, and the full recurring-flows table/projection off Overview onto their respective sub-pages (recurring flows likely become their own future sub-page or stay on Budget).
- [ ] **Replace Overview entirely** &mdash; default tab becomes Values; the header lives in the shared layout above the tabs.
- [ ] **Leave Overview unchanged; just add the new tabs alongside** &mdash; users see the same content on Overview plus duplicated content on the new tabs. Easiest; least clean.

**Answer: Recurring flows becomes their own sub-page.**

### Q1.2 &mdash; How are the sub-pages wired up against existing list components?

The top-level pages (`/admin/values`, `/admin/exchanges`, &hellip;) are full data-table components that already accept a `valueStreamId` filter.

- [x] **Reuse the existing list components with a `valueStreamId` prop pre-applied** &mdash; thinnest layer; the new pages embed `ValuesDataTable`, `ExchangesDataTable`, etc. passing the value-stream id. Bug fixes in one place. The components already render their own toolbar, filters, and pagination.
- [ ] **Build dedicated stream-scoped components** &mdash; freedom to tailor each sub-page (e.g., hide the &ldquo;value stream&rdquo; filter chip when it's implied); doubles the surface to maintain.
- [ ] **Iframe / embed the existing top-level page** &mdash; zero new code; weird UX (nested chrome).

**Answer:But automatically hide the ValueStream column if embedded in the ValueStreams details page's tabs.**

### Q1.3 &mdash; How is the &ldquo;Agreements&rdquo; tab scoped, given `Agreement` has no `valueStreamId` FK?

Agreements today link parties (Agents). There's no first-class link to a value stream.

- [x] **Add a nullable `valueStreamId` FK to `Agreement`** &mdash; mirrors the other entities; one small migration; agreements page filters by it. The agreement form gets a Value Stream picker.
- [ ] **Derive: show agreements whose `agreementTemplate.valueStreamId == :id`** &mdash; no schema change; only works for agreements created from a stream-scoped template; lots of agreements would not show up.
- [ ] **Derive: show agreements between agents who lead or appear on flows in this stream** &mdash; conceptually murky; expensive queries; brittle.
- [ ] **Skip the agreements tab in v1** &mdash; document as out-of-scope; ship the other four sub-pages first.

**Answer:**

### Q1.4 &mdash; How are agreement templates filtered for the &ldquo;Agreement Templates&rdquo; tab?

`AgreementTemplate.valueStreamId` is nullable &mdash; templates can be stream-specific or global.

- [x] **Show templates whose `valueStreamId == :id` OR `valueStreamId IS NULL`** &mdash; surfaces both stream-specific *and* globally-available templates; matches typical &ldquo;templates usable here&rdquo; semantics.
- [ ] **Only stream-specific templates** (`valueStreamId == :id`) &mdash; strict; global templates have to be reached via the top-level page.
- [ ] **All templates regardless of stream** &mdash; ignores the FK; not very useful at stream scope.

**Answer:**

### Q1.5 &mdash; What is the tab order in the layout?

- [x] **Overview, Values, Offerings, Agreement Templates, Agreements, Exchanges, Budget** &mdash; rough &ldquo;definition &rarr; binding &rarr; execution &rarr; accounting&rdquo; flow of a value stream's lifecycle.
- [ ] **Overview, Budget, then the new five in alphabetical order** &mdash; predictable; less narrative.
- [ ] **Overview, Values, Exchanges, Agreements, Agreement Templates, Offerings, Budget** &mdash; mirrors the order the user listed in the request.

**Answer:**

### Q1.6 &mdash; How do tabs render when the strip overflows on small screens?

Seven tabs won't fit on a phone.

- [ ] **Horizontal scroll with snap** &mdash; tabs remain visible; user swipes; shadcn pattern. Sub-route stays mounted while user scrolls.
- [x] **Collapse to a dropdown on mobile** ("Section: Overview &#9662;") &mdash; cleaner top bar; one extra click to switch.
- [ ] **Stack vertically as an accordion** &mdash; clunky for routing-based tabs.

**Answer:**

### Q1.7 &mdash; What happens to the per-section &ldquo;Create X&rdquo; buttons?

The current Overview header has "Create value" and "Create exchange" buttons.

- [x] **Each sub-page has its own &ldquo;Create &lt;X&gt;&rdquo; button** (already provided by the underlying data-table components). Overview keeps a small "quick actions" row with the two most-used CTAs for discoverability.
- [ ] **Move all CTAs into a single &ldquo;Create&rdquo; dropdown on Overview only** &mdash; consolidated but less contextual.
- [ ] **Drop CTAs from Overview; only sub-pages have them** &mdash; cleanest split; loses the &ldquo;land on Overview, create something quickly&rdquo; flow.

**Answer:**

---

When you&apos;ve answered (or accepted the recommendations), reply **&ldquo;Done&rdquo;** and I&apos;ll append Round 2 &mdash; Shape (data-table prop changes, default sorts/filters, breadcrumbs, route structure).

---

## Round 2 &mdash; Shape

Round 1 set scope. This round defines the **data-table embedding contract, the Agreement schema change, route structure, and what exactly each sub-page renders**.

### Q2.1 &mdash; How does each data-table component learn it's embedded?

Several existing components (`ValuesDataTable`, `ExchangesDataTable`, `OfferingsDataTable`, `AgreementsDataTable`, `AgreementTemplatesDataTable`, `RecurringFlowsDataTable`) already accept a `valueStreamId` prop. They need to also hide the stream column when embedded.

- [x] **Reuse the existing `valueStreamId` prop as the signal** &mdash; when `valueStreamId` is set, hide the stream column and pre-fill new-record forms with that id. One concept, no new prop. The few components that accept `valueStreamId` only as a query filter (without hiding the column) get tightened.
- [ ] **Add a new `embedded` / `scopedToStreamId` prop alongside `valueStreamId`** &mdash; explicit; two-prop API; small risk of mismatched values.
- [ ] **Read a `ValueStreamContext`** (React context provided by the layout) &mdash; clean for nested components; bigger refactor.

**Answer:**

### Q2.2 &mdash; Adding `valueStreamId` to `Agreement`

The accepted Q1.3 path is &ldquo;add a nullable FK.&rdquo; Pick the migration & UI shape:

- [x] **Migration adds `valueStreamId uuid` (nullable) + FK with `ON DELETE SET NULL`; create/update schemas accept it as optional; agreements list filters by it; agreement form/dialog gains a Value Stream picker mirroring Invoice's** &mdash; consistent with Invoice/Offering pattern.
- [ ] **Same migration, but FK with `ON DELETE RESTRICT`** &mdash; protective; risks blocking value-stream deletion when agreements reference it.
- [ ] **Add an M:N `agreement_value_streams` join table** &mdash; one agreement spanning multiple streams; overkill for v1.

**Answer:**

### Q2.3 &mdash; Where does the shared header (image, name, edit/delete buttons) live?

Today the header is rendered inside the Overview `page.tsx`. With 7 tabs that all need it, the cleanest spot is `layout.tsx` so it persists across tab navigation.

- [x] **Move the header into `[id]/layout.tsx` above the tab strip** &mdash; one source of truth; the header doesn't re-mount on tab switch; Overview becomes much smaller.
- [ ] **Duplicate the header in every sub-page** &mdash; six copies; bug-prone.
- [ ] **Leave the header on Overview only** &mdash; sub-pages have no obvious indicator of which value stream they're scoped to (just breadcrumbs); poor UX.

**Answer:**

### Q2.4 &mdash; Route structure

Picked tab order (Q1.5): Overview, Values, Offerings, Agreement Templates, Agreements, Exchanges, Recurring Flows, Budget. Each non-Overview tab needs a sub-route.

- [x] **One folder per tab under `[id]/`**:
  ```
  /admin/value-streams/[id]/
  ├── layout.tsx                  ← header + tabs
  ├── page.tsx                    ← Overview (slim)
  ├── values/page.tsx             ← embeds ValuesDataTable
  ├── offerings/page.tsx          ← embeds OfferingsDataTable
  ├── agreement-templates/page.tsx
  ├── agreements/page.tsx
  ├── exchanges/page.tsx
  ├── recurring-flows/page.tsx
  └── budget/page.tsx             ← unchanged
  ```
  Each `page.tsx` is a one-line re-export from a corresponding `@marketlum/ui` page component.
- [ ] **All tab content rendered conditionally by `page.tsx` based on a `?tab=` query** &mdash; one file; breaks shareable URLs and SSR pre-rendering per tab.

**Answer:**

### Q2.5 &mdash; Recurring Flows sub-page composition

Today Overview shows `RecurringFlowsSummaryCard` + `RecurringFlowsDataTable` + `RecurringFlowsProjection` stacked. Moving to its own tab is the right home, but what stays?

- [x] **All three components** &mdash; summary, data table, projection. The Budget tab is the analytical view; this Recurring Flows tab is the operational one (manage individual flows, see live projection).
- [ ] **Data table only** &mdash; projection moves to Budget (it already lives there in spirit); summary card is redundant with Budget's headline.
- [ ] **Data table + projection** &mdash; summary card moves to Overview (smaller hint above the chart).

**Answer:**

### Q2.6 &mdash; What stays on the slimmed Overview tab?

Pick all that apply (multi-select).

- [x] **Header** (already moved to layout per Q2.3 &mdash; so this is implicit)
- [x] **RevenueExpenses chart** &mdash; the date-range picker keeps it interactive on Overview only.
- [x] **&ldquo;Quick actions&rdquo; row: Create Value + Create Exchange + Create Recurring Flow** &mdash; the three most-used CTAs.
- [x] **Top-level counts row** &mdash; e.g., `5 values · 3 offerings · 8 exchanges · 12 recurring flows`, each linking to the matching tab. Useful at-a-glance landing.
- [ ] **Recent values list (existing)** &mdash; redundant once Values is its own tab; drop.
- [ ] **Recent exchanges list (existing)** &mdash; drop, same reasoning.
- [ ] **RecurringFlowsSummaryCard** &mdash; moves to the Recurring Flows tab (Q2.5).

**Answer:**

### Q2.7 &mdash; What signals the active tab visually when its URL is the active one?

The current tab strip (spec 003) compares `pathname.endsWith('/budget')`. With seven sub-routes, the matcher needs to handle them all.

- [x] **Each tab declares its full href; active is whichever href matches the start of `pathname`** &mdash; covers `/values`, `/agreement-templates`, etc. uniformly; Overview is active when `pathname` ends with `/[id]` (no trailing segment).
- [ ] **Hard-code an `if/else` per tab** &mdash; works for 7 tabs; doesn't scale.
- [ ] **Use Next.js `useSelectedLayoutSegment()` hook** &mdash; idiomatic; segment names match the folder structure cleanly. The Overview case (no segment) returns `null`.

**Answer:**

---

When you&apos;ve answered, reply **&ldquo;Done&rdquo;** and I&apos;ll append Round 3 &mdash; Delivery (BDD scope, template-sync, PR shape, migration ordering).

---

## Round 3 &mdash; Delivery

This is the final round. It covers BDD coverage, template sync, PR shape, and explicit out-of-scope boundaries.

### Q3.1 &mdash; Does the embedded `valueStreamId` prop also prefill the &ldquo;create new&rdquo; form?

Q2.1 said "presence implies hide stream column **and** pre-fill new-record forms with that id." Confirming the behaviour:

- [x] **Yes &mdash; the &ldquo;Create &lt;X&gt;&rdquo; button on each embedded table opens its form dialog with the current value stream pre-selected and (optionally) the field disabled so users can't accidentally reassign it** &mdash; matches the spirit of "this section is scoped to this stream."
- [ ] **Prefill but not disabled** &mdash; users can still change the value stream during creation; less locked-down.
- [ ] **Don't prefill** &mdash; create form opens blank; users pick the stream manually. Loses the convenience.

**Answer:**

### Q3.2 &mdash; BDD scope

Pick all that apply (multi-select). Existing data-table behaviour is already covered by BDD on the top-level pages; only the *new* behaviours need new scenarios.

- [x] **`agreements/` BDD: filter by `valueStreamId`, create with `valueStreamId`, update to set/unset `valueStreamId`** &mdash; mirrors offerings/invoices coverage; ~5 new scenarios. The migration's effects are exercised end-to-end.
- [ ] **`value-stream-sections/` BDD: smoke tests that each sub-route returns 200 and embeds the right table** &mdash; UI routing test; would need browser-level testing per existing memory (no full e2e in conversation). Skip.
- [x] **No new BDD for data-table column-hiding** &mdash; pure presentational; verified via `tsc` and visual review.
- [x] **No new BDD for the layout&apos;s tab strip** &mdash; same reasoning; covered by spec 003's existing Overview/Budget mechanism.

**Answer:**

### Q3.3 &mdash; PR shape

This spec has both a backend change (Agreement migration) and a substantial UI restructure.

- [x] **One PR**: backend migration first in the diff, then the UI tabs + sub-pages + data-table tightening, then BDD &mdash; the UI changes don't make sense without the backend; rollback story is cleaner.
- [ ] **Two PRs**: (1) Agreement valueStreamId migration + service/schema + BDD, (2) UI tab strip + sub-pages + data-table embedded behaviour &mdash; finer-grained; PR 2 has nothing to validate against in CI until PR 1 merges; doubles overhead.
- [ ] **Three PRs**: (1) Agreement valueStreamId, (2) data-table embedded behaviour + header move to layout, (3) Sub-pages + tab strip update &mdash; smallest diffs; longest delivery.

**Answer:**

### Q3.4 &mdash; Template sync (per `CLAUDE.md`)

Every `apps/web/src/app/admin/value-streams/[id]/...` route added/changed must be mirrored to `packages/create-marketlum-app/template/`.

- [x] **Mirror every new `page.tsx` and the updated `layout.tsx`** under the template path. The page files are one-line re-exports from `@marketlum/ui`; the layout already lives at the matching path from spec 003 and gains the header + extended tab list there too.
- [ ] **Skip template sync for now and backfill in a follow-up** &mdash; violates the CLAUDE.md mandate; rejected.

**Answer:**

### Q3.5 &mdash; What is explicitly out of scope?

Pick all that apply (multi-select).

- [x] **No M:N agreement&harr;value-stream relationship** &mdash; only the single nullable FK (Q2.2).
- [x] **No backfilling of `valueStreamId` on existing agreements** &mdash; the column defaults to `NULL` for legacy rows; admins associate them as they edit.
- [x] **No new global filters on existing top-level list pages** &mdash; the tightening of the `valueStreamId` prop happens; the top-level pages keep their visible stream column when `valueStreamId` is unset.
- [x] **No refactor of the underlying data-table internals** beyond the embedded prop&apos;s new effect (hide column + prefill form). Sorting, pagination, perspectives, etc. stay as-is.
- [ ] **No mobile dropdown for the tab strip** &mdash; we agreed in Q1.6 to ship the dropdown; this is *in* scope.

**Answer:**

### Q3.6 &mdash; Anything to defer / future work?

Pick all that apply (multi-select). These are deliberate non-goals captured as "future" so they don't get crammed in.

- [x] **A &ldquo;Members / Leads&rdquo; sub-page** listing users with `lead` on this stream + agents who appear as counterparties &mdash; useful but separate spec.
- [x] **A &ldquo;Files&rdquo; sub-page** &mdash; per-stream file library; depends on adding `valueStreamId` to `File` first.
- [x] **A &ldquo;Tensions&rdquo; sub-page** &mdash; tensions don&apos;t link to streams today either; deferred along with the Agreement-style FK addition.
- [ ] **&ldquo;Recurring flows&rdquo; folded back into Budget** &mdash; we explicitly separated them; not future work, just a non-decision.

**Answer:**

---

When you&apos;ve answered, reply **&ldquo;Done&rdquo;** and I&apos;ll consolidate every decision into `specs/004-value-stream-sections-specification.md` and commit both files.
