# Recurring Flows for Value Streams — Brainstorming

> **Goal:** Define how Marketlum tracks recurring revenues and expenses attached to each value stream.
>
> **Process:** One round of questions at a time. The user appends answers below each question. Existing content is never modified.

## Context

The current domain has:

- `ValueStream` — a tree of streams owned by lead users
- `Exchange` + `ExchangeFlow` — **one-off** transfers of value between two agents
- `Ledger` (`Account`, `Transaction`) — accounting-style records
- `Offering` — packaged values priced for sale
- `Agreement` — formal terms between parties

Today there is no first-class way to say *&ldquo;value stream X earns $5k/month from customer A and spends $1.2k/month on vendor B.&rdquo;* This brainstorming defines that.

```
                ┌────────────────────────────┐
                │       ValueStream          │
                │  (tree, owned by lead)     │
                └─────────────┬──────────────┘
                              │
              ┌───────────────┴────────────────┐
              │                                │
        REVENUES IN                      EXPENSES OUT
        (recurring)                      (recurring)
              │                                │
   ┌──────────┴──────────┐          ┌──────────┴──────────┐
   │ $5k/mo from Acme    │          │ $1.2k/mo to AWS     │
   │ $800/yr from Globex │          │ $300/mo to Slack    │
   └─────────────────────┘          └─────────────────────┘
```

---

## Round 1 &mdash; Foundations

The first round nails down the conceptual model. Everything later (UI, schema, technology) flows from this.

### Q1.1 &mdash; Is this a new entity or an extension of existing ones?

- [x] **New first-class entity `RecurringFlow`** &mdash; clean separation; recurrence is not a natural property of one-off `Exchange`/`ExchangeFlow`; can have its own lifecycle (active/paused/ended), its own UI, and its own analytics rollups
- [ ] **Extend `ExchangeFlow`** with a recurrence rule &mdash; reuses the agent/value modelling but conflates one-off transfers with recurring commitments
- [ ] **Derive from `Offering` + `Agreement`** &mdash; pure projection: each priced offering under an active agreement implies a recurring inflow; requires no new entity but limits modelling of expenses (we don&apos;t buy via our own offerings)

**Answer:**

### Q1.2 &mdash; What scope of values does a recurring flow capture?

- [ ] **Money only (revenues and expenses)** &mdash; matches the user&apos;s stated framing; keeps the model tight and finance-reportable
- [x] **Any value type** (money, hours, units of a service&hellip;) &mdash; more expressive, more complex; would need a generic &ldquo;recurring transfer&rdquo; concept rather than a finance one
- [ ] **Money plus a small allow-list** (e.g. money + headcount) &mdash; middle ground; risks ad-hoc growth

**Answer: Every RecurringFlow should optionally reference a single Value entity.**

### Q1.3 &mdash; What is the relationship to actual ledger transactions?

- [ ] **Both: a recurring flow is a *plan* (template + schedule), and the system materialises ledger `Transaction` rows on each occurrence** &mdash; gives forecasting *and* actuals from one source of truth, with the ability to reconcile (skip/edit/replace an occurrence)
- [x] **Plan only (no auto-transactions)** &mdash; simpler; recurring flows exist purely for budgeting/forecasting and never touch the ledger
- [ ] **Actuals only** &mdash; users manually create transactions; recurring flow is just metadata tagging a pattern after the fact

**Answer:**

### Q1.4 &mdash; Is a counterparty `Agent` always required?

- [ ] **Optional** &mdash; many real expenses (subscriptions, overhead) don&apos;t justify maintaining an Agent record; revenue lines often do
- [x] **Always required** &mdash; forces clean modelling; users must create an Agent for every counterparty (more friction, but better analytics)
- [ ] **Required for revenue, optional for expense** &mdash; revenue typically has a known customer; expenses often don&apos;t

**Answer:**

### Q1.5 &mdash; Does a recurring flow belong to exactly one value stream?

- [x] **Exactly one** &mdash; matches the &ldquo;each value stream&rdquo; framing; simplifies rollups; if a flow truly spans streams, split it
- [ ] **One or many** &mdash; allows allocation splits (60% to Stream A, 40% to Stream B); more flexible, more complex (needs allocation weights)
- [ ] **Zero or one** &mdash; allows &ldquo;company-wide&rdquo; flows not attached to any stream

**Answer:**

---

*(Further rounds will cover: recurrence patterns and calendar, lifecycle/state machine, UI/UX surfaces, schema details, currency/FX, integration with offerings/agreements, permissions, technology choices, and migration/seed strategy.)*

---

## Round 2 &mdash; Shape of a RecurringFlow

Round 1 established that a `RecurringFlow` is a **new entity**, **plan-only**, attached to **exactly one value stream**, with a **required counterparty `Agent`** and an **optional `Value` reference** (so it can express money or any other value type).

This round nails down the actual fields on that entity.

### Q2.1 &mdash; How is direction (revenue vs expense) expressed?

A flow needs to be classifiable as &ldquo;coming in&rdquo; vs &ldquo;going out&rdquo; for rollups and reports.

- [x] **Single entity with `direction` enum (`inbound` / `outbound`)** &mdash; one table, one UI, one API; explicit and queryable; recommended
- [ ] **Derived from `fromAgent` vs `toAgent` plus a system notion of &ldquo;our&rdquo; agent** &mdash; cleanest conceptually but Marketlum doesn&apos;t currently have a global &ldquo;owning&rdquo; agent concept
- [ ] **Two separate entities (`RecurringRevenue`, `RecurringExpense`)** &mdash; clean conceptually but doubles surface area (two tables, two services, two UIs)
- [ ] **Sign of amount carries direction (positive = revenue, negative = expense)** &mdash; compact but error-prone, hard to query

**Answer:**

### Q2.2 &mdash; How are amount and currency / unit modelled?

A flow needs a number and a unit. The unit is a currency for money flows and something else (hours, kg, &hellip;) for non-money flows.

```
  Money flow:    amount=5000        unit="USD"          valueId=null
  Hours flow:    amount=10          unit="hours"        valueId=<Advisory>
  Headcount:     amount=2           unit="FTE"          valueId=<Engineer>
```

- [x] **`amount` (decimal) + `unit` (free-text)** &mdash; simplest; user types &ldquo;USD&rdquo;, &ldquo;EUR&rdquo;, &ldquo;hours&rdquo;, &ldquo;FTE&rdquo;; lightweight and flexible
- [ ] **`amount` + `currencyCode` (ISO 4217) plus separate `quantityUnit` (text) for non-money flows** &mdash; explicit currency typing; requires a discriminator (is this a money flow?)
- [ ] **`amount` + reference to a `unit` taxonomy node** &mdash; data-as-config; consistent with Marketlum&apos;s taxonomy pattern but adds setup friction
- [ ] **`amount` + `unit` enum** &mdash; controlled vocabulary; rigid; needs enum migrations to add units

**Answer:**

### Q2.3 &mdash; How is the recurrence pattern expressed?

- [x] **`frequency` enum (`daily`, `weekly`, `monthly`, `quarterly`, `yearly`) + `interval` (every N units, default 1) + `startDate` + optional `endDate`** &mdash; covers 99% of real subscriptions; trivial UI; easy to project forward for &ldquo;next N occurrences&rdquo; calculations
- [ ] **RRULE (RFC 5545 iCal recurrence string)** &mdash; maximally expressive (e.g. &ldquo;every 2nd Tuesday&rdquo;); needs a parser and a richer UI; over-engineered for business flows
- [ ] **Cron expression** &mdash; programmer-friendly; unsuitable for business users
- [ ] **Just `frequency` (no interval multiplier) + start / end dates** &mdash; even simpler; loses &ldquo;every 6 months&rdquo; / &ldquo;every 2 years&rdquo;

Visualization of recommended option:

```
  Monthly subscription (every 1 month, starts 2026-01-15, no end):
    Jan 15 — Feb 15 — Mar 15 — Apr 15 — May 15 — Jun 15 — …

  Quarterly retainer (every 1 quarter, starts 2026-01-01, ends 2026-12-31):
    Q1 — Q2 — Q3 — Q4

  Bi-annual review fee (every 2 years, starts 2026-06-01):
    Jun 2026 — Jun 2028 — Jun 2030 — …
```

**Answer:**

### Q2.4 &mdash; What lifecycle / status states does a flow have?

A flow&apos;s &ldquo;is this live right now?&rdquo; could be driven entirely by dates, or by an explicit status, or both.

- [x] **`draft` → `active` → `paused` → `ended`** &mdash; explicit states; `paused` is useful when a customer temporarily halts a subscription without ending it; `ended` keeps history. Status is the source of truth; `endDate` is observational
- [ ] **`active` / `inactive` only** &mdash; simpler; dates already encode &ldquo;ended&rdquo;
- [ ] **No status; rely entirely on `startDate` / `endDate`** &mdash; purest data model; harder to express &ldquo;paused with intent to resume&rdquo;
- [ ] **Add `cancelled` (distinct from `ended`)** &mdash; distinguishes &ldquo;ran its planned course&rdquo; vs &ldquo;terminated early&rdquo;; useful for churn analytics

**Answer:**

### Q2.5 &mdash; What categorization beyond value stream + agent + value?

Useful for analytics &ldquo;show me all SaaS expenses across all streams&rdquo; or &ldquo;how much do I earn from licensing vs. services?&rdquo;

- [x] **Free-text `description` + many-to-many `taxonomies`** &mdash; mirrors the rest of the domain (values, agents, etc. already use taxonomies); users tag with their own categories
- [ ] **Free-text `description` only** &mdash; simpler; loses cross-flow categorization
- [ ] **Hard-coded `category` enum (e.g. `subscription`, `licensing`, `services`, `payroll`, &hellip;)** &mdash; controlled but rigid; one-size-fits-no-one
- [ ] **Optional reference to an `Offering` (for revenue) and a generic `vendor` text (for expense)** &mdash; structured for revenue; loose for expense

**Answer:**

### Q2.6 &mdash; Should a flow always have a date anchor for accruals / day-counting?

Even without auto-generated transactions, downstream reports often want to know &ldquo;total revenue in March 2026&rdquo; for this flow. That requires knowing when in the period the flow &ldquo;happens.&rdquo;

- [x] **A single `anchorDate` (the date of the first occurrence) plus the frequency determines all subsequent occurrence dates** &mdash; simplest; analytics derives per-period totals from `anchorDate` + `frequency` + `interval`
- [ ] **`anchorDate` plus an optional explicit list of dates the flow has been overridden to** &mdash; allows holiday / one-off shifts; complexity creep on a plan-only model
- [ ] **No anchor date; period attribution is by &ldquo;effective month&rdquo; (whole-month granularity)** &mdash; simplest analytics but loses sub-month precision
- [ ] **Anchor date plus a separate `billingDayOfMonth`** &mdash; common in real billing systems; redundant with `anchorDate` for most cases

**Answer:**

---

## Round 3 &mdash; UI / UX Surfaces

Now we know the entity shape. This round decides where users *see* and *interact* with recurring flows in the admin UI.

### Q3.1 &mdash; Where does the recurring flows admin live?

- [x] **Both: a top-level `/admin/recurring-flows` page (cross-stream list, filter, search) AND a &ldquo;Flows&rdquo; tab inside each ValueStream detail page (scoped to that stream)** &mdash; cross-stream view for finance/management, scoped view for stream-level work
- [ ] **Only a top-level page** &mdash; one place to find everything; users filter to the stream they care about
- [ ] **Only inside the ValueStream detail page** &mdash; every flow is always viewed in stream context; loses cross-stream rollups
- [ ] **Top-level page is the only one users navigate to; ValueStream detail shows a read-only summary widget that links into the top-level page filtered by stream** &mdash; one canonical UI; less duplication

**Answer:**

### Q3.2 &mdash; List view shape

- [x] **Single DataTable with sortable columns: Direction (icon), Counterparty Agent, Value (when set) / Description, Amount + Unit, Frequency (e.g. &ldquo;every 1 month&rdquo;), Start, Status, Value Stream (only on cross-stream view); standard toolbar with filters and column visibility** &mdash; matches the rest of the admin
- [ ] **Two separate tabs (Revenues / Expenses) on the same page** &mdash; explicit but loses easy cross-direction comparison
- [ ] **Card grid (one card per flow)** &mdash; visually richer; harder to scan large lists
- [ ] **Grouped table: rows grouped by counterparty agent or by value stream** &mdash; helpful for some workflows but heavier in the default view

**Answer:**

### Q3.3 &mdash; How is the ValueStream detail page enriched?

The stream detail page is currently sparse. With recurring flows it can show a financial summary.

- [x] **A &ldquo;Recurring Flows&rdquo; summary card at the top of the stream detail page** showing: normalised monthly revenue per unit, normalised monthly expense per unit, net (when units match), count of active flows; below it, a flows tab with the scoped table
- [ ] **Just the flows tab, no summary card** &mdash; minimalist
- [ ] **Summary card + 12-month projection sparkline chart** &mdash; richer visual; recommended option plus a chart
- [ ] **Full dashboard treatment: summary cards + chart + breakdown by counterparty + breakdown by taxonomy** &mdash; powerful but heavy

**Answer:**

### Q3.4 &mdash; Recurrence input UX in the create / edit form

- [x] **Inline natural-language builder**: three controls in one row &mdash; &ldquo;Every [interval number] [frequency dropdown] starting [date picker]&rdquo; with an optional &ldquo;ending [date picker]&rdquo;; below the row, a small generated preview &ldquo;Next 3 occurrences: Feb 15, Mar 15, Apr 15&rdquo;
- [ ] **Two fields side by side** (frequency dropdown, interval number) + start / end date pickers, no preview &mdash; functional but you have to imagine the schedule
- [ ] **Calendar picker showing dots on projected occurrence dates** &mdash; very visual; bigger build
- [ ] **Free-text input parsed by a library (&ldquo;every other month&rdquo;)** &mdash; magical when it works, frustrating when it doesn&apos;t

**Answer:**

### Q3.5 &mdash; Forecast / projection view

Recurring flows have predictable future values. Surface them how?

- [x] **A &ldquo;Projections&rdquo; tab on the ValueStream detail page**: a stacked-bar chart (revenue green, expense red) showing projected monthly totals for the next 12 months, plus a per-month breakdown table below; controls to change horizon (3/6/12/24 months) and unit filter
- [ ] **No projection view in v1** &mdash; ship the flows table and add projections later based on feedback
- [ ] **Full calendar view** where each occurrence is a dot/event on a month grid &mdash; nice for individual flows; busy at stream scale
- [ ] **Annual rollup table** (one row per flow, twelve columns for months, totals row at bottom) &mdash; spreadsheet-style; great for export, less great for at-a-glance
- [ ] **Both: stacked-bar chart on the stream detail page AND a full calendar view as a separate route** &mdash; biggest scope

**Answer:**

### Q3.6 &mdash; How are non-comparable units handled in rollups?

Since flows can be in any unit (USD, EUR, hours, FTE&hellip;), &ldquo;total revenue&rdquo; isn&apos;t one number.

- [x] **Group rollups by unit: display a small table of per-unit totals (e.g. &ldquo;$5,000/mo USD&rdquo;, &ldquo;€800/mo EUR&rdquo;, &ldquo;10 hr/mo&rdquo;)** &mdash; honest; no fake conversion
- [ ] **Show money-only rollups in summary cards; non-money flows are listed but excluded from the summary** &mdash; clean financial view; non-money flows feel second-class
- [ ] **Convert all to a single configurable &ldquo;base currency&rdquo; using user-maintained rates** &mdash; one number; opens currency-management can of worms
- [ ] **Single unified total per direction with a &ldquo;mixed units&rdquo; flag when more than one unit is present** &mdash; compact but loses information

**Answer:**

### Q3.7 &mdash; What happens when a flow&apos;s lifecycle status changes?

A user moves a flow from `active` → `paused` (or → `ended`). What is the UX?

- [x] **Status changes via a dedicated action menu (&ldquo;Pause&rdquo;, &ldquo;Resume&rdquo;, &ldquo;End&rdquo;) on the flow row and detail page; transitions are validated by a state machine (e.g. you can&apos;t resume an `ended` flow &mdash; clone it instead). Ending prompts for an optional `endDate` (defaults to today)** &mdash; explicit actions, prevents nonsensical transitions
- [ ] **Status is a dropdown in the edit form &mdash; user picks any value** &mdash; simpler, more error-prone
- [ ] **Action menu plus an optional &ldquo;reason&rdquo; field captured on each transition** &mdash; better audit; more complexity
- [ ] **Bulk actions in the list view (select multiple, &ldquo;Pause selected&rdquo;)** in addition to per-row actions &mdash; useful for management; more UI

**Answer:**

---

## Round 4 &mdash; Integration, Security, Delivery

Final round. After this I&apos;ll write the specification.

### Q4.1 &mdash; Integration with `Offering` / `Agreement`

Marketlum already has `Offering` (priced bundles of values) and `Agreement` (formal terms between parties). Recurring flows often correspond to one of these &mdash; e.g. a customer&apos;s monthly subscription IS the recurring revenue for an offering under an agreement.

- [x] **Optional reference to either or both: a flow can link to an `Offering` (typical for revenue), an `Agreement` (typical for both directions), or neither (standalone)** &mdash; flexible; the link is a navigation aid and a future enabler (e.g. auto-create flows from a signed agreement), not a constraint
- [ ] **Required `Agreement` reference for all flows** &mdash; forces clean modelling; high friction for casual expense entry
- [ ] **No links &mdash; keep flows standalone** &mdash; simpler; loses the obvious connection to offerings/agreements that users have already modelled
- [ ] **Required `Agreement` for revenue, optional for expense** &mdash; mirrors typical reality but introduces a direction-dependent rule

**Answer:**

### Q4.2 &mdash; Permissions

- [x] **All authenticated users can read; create / edit / delete / status-transition restricted to either the platform admin OR the lead user of the flow&apos;s value stream** &mdash; mirrors stream ownership; low friction for stream leads, safe by default
- [ ] **Admin-only for all mutations; everyone can read** &mdash; tightest; bottleneck on admin
- [ ] **Any authenticated user has full CRUD** &mdash; loosest; matches the current default for most entities
- [ ] **Read-only for all; mutations admin-only** &mdash; safest; least useful

**Answer:**

### Q4.3 &mdash; Referential integrity when an Agent or Value is deleted

Given Q1.4 made the counterparty `Agent` always required:

- [x] **Agent deletion: RESTRICT &mdash; you cannot delete an Agent that has any non-`ended` RecurringFlow (UI prompts to end or reassign first). Value deletion: SET NULL (the flow keeps its amount/unit and loses the value link)** &mdash; protects active financial records, allows graceful cleanup of stale references
- [ ] **Agent: CASCADE delete the flows; Value: SET NULL** &mdash; clean but silent data loss
- [ ] **Agent: SET NULL (relax the required constraint when underlying agent is gone); Value: SET NULL** &mdash; preserves the flow but breaks the invariant
- [ ] **Agent: implement soft-delete on the Agent model and keep the flows** &mdash; cleanest history; requires changing the existing Agent model (out of scope)

**Answer:**

### Q4.4 &mdash; Seed sample data and CSV export

Two small, related questions bundled.

**Seed:**
- [x] **`pnpm seed:sample` adds 3&ndash;5 recurring flows per existing value stream**, mixing inbound / outbound, varied units (USD, EUR, hours), varied frequencies; counterparty agents drawn from the existing seeded agents
- [ ] **One example flow per stream**
- [ ] **A separate `seed:flows` command** that users invoke manually
- [ ] **No seed data** &mdash; users add flows themselves

**Export:**
- [x] **CSV export on both list views (top-level and per-stream)**, using the existing export pattern in the codebase
- [ ] **No export in v1**
- [ ] **CSV plus a dedicated &ldquo;Financial summary&rdquo; PDF per ValueStream**
- [ ] **CSV + Excel + PDF**

**Answer (seed):**

**Answer (export):**

### Q4.5 &mdash; Technology choices

A few defaults that I will adopt unless you say otherwise:

- **State machine** in `@marketlum/shared` next to existing ones (the codebase already follows this pattern).
- **Chart library** for the projections stacked-bar chart: **d3** (already in `@marketlum/ui` deps) with a thin React wrapper. No new dependency.
- **Date arithmetic** for occurrence projection: pure functions in `@marketlum/shared` (no `date-fns` / `luxon` &mdash; current code uses native `Date`).
- **Validation**: Zod schemas in `@marketlum/shared` as the single source of truth (matches existing pattern).
- **BDD coverage**: full coverage matching the rest of the framework (CRUD, status transitions, list filters, rollup queries, projection queries, permission checks) &mdash; expect a similar scenario count to the `offerings` module (~28 scenarios).

- [x] **Adopt the above defaults**
- [ ] **Push back &mdash; I want to discuss one or more of these** (specify in Answer)

**Answer:**

### Q4.6 &mdash; Delivery phasing

The full scope spans entity + API + cross-stream list page + per-stream tab + summary card + projections chart + BDD suite. How should it ship?

- [x] **One PR end-to-end** &mdash; keeps the BDD specs and the UI in lockstep; matches how the framework has built other modules (offerings, exchanges)
- [ ] **Two PRs: (1) entity + API + CRUD UI + BDD; (2) summary card + projections chart** &mdash; ships value sooner; risk of (2) drifting
- [ ] **Three PRs: (1) entity + API; (2) CRUD UI; (3) summary + projections** &mdash; finest granularity; most overhead
- [ ] **MVP only: ship (1) and decide on (2) and (3) based on feedback** &mdash; deferred commitment; least scope risk

**Answer:**
