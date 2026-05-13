# Exchange Rates Between Values — Brainstorming

> **Goal:** Define how Marketlum models, stores, and applies conversion rates between `Value` entities (e.g. USD → EUR, hour-of-consulting → USD, kWh → USD) so that flows, invoices, and rollups can be expressed in a common unit.
>
> **Process:** One round of questions at a time. The user appends answers below each question. Existing content is never modified.

## Context

The current domain has:

- `Value` — any unit of value (`ValueType` is `PRODUCT | SERVICE | RELATIONSHIP | RIGHT`). Currencies are already modelled as `Value` rows — `Invoice.currencyId` is a FK to `values`.
- `ValueInstance` — a concrete realization of a `Value` (a specific batch, version, deliverable).
- `Exchange` + `ExchangeFlow` — multi-party transfers; each flow has `valueId` (or `valueInstanceId`) and a decimal `quantity` (precision 12, scale 2). No rate is recorded.
- `Invoice` + `InvoiceItem` — items have `quantity`, `unitPrice`, `total`; the invoice has one `currencyId` (a `Value`). Conversions across currencies are not tracked anywhere today.
- `RecurringFlow` — has a free-form `unit` string, not tied to a `Value`.
- `Agent`, `ValueStream`, `Pipeline`, `Channel`, etc. — surrounding context.

Today there is **no** concept of "1 USD = 0.92 EUR" or "1 hour of consulting = 200 USD" in the model. This means:

- An `Exchange` with one flow of `100 USD` and one flow of `5 hours of consulting` cannot be reasoned about as balanced/unbalanced.
- A `ValueStream` rollup that mixes currencies has to pick one currency and silently ignore the others.
- Multi-currency invoices and reports are not possible.

This brainstorm defines a first-class **ExchangeRate** concept.

```
                    ┌──────────────────────────────┐
                    │            Value             │
                    │  (USD, EUR, hour-of-consult, │
                    │   kWh, license, etc.)        │
                    └───────┬──────────────┬───────┘
                            │              │
                            │              │
                       fromValue       toValue
                            │              │
                            └──────┬───────┘
                                   ▼
                       ┌──────────────────────────┐
                       │      ExchangeRate        │
                       │  rate = 0.92             │
                       │  effectiveAt = 2026-…    │
                       │  source = "ECB" / manual │
                       └──────────────────────────┘

Conversion:  amountIn(toValue) = amountIn(fromValue) × rate
Example:     fromValue=USD, toValue=EUR, rate=0.92  →  100 USD = 92 EUR
```

---

## Round 1 &mdash; Foundations

This round nails down the conceptual model. Everything later (schema, API, UI, technology) flows from these choices.

### Q1.1 &mdash; Is `ExchangeRate` a new entity or an extension?

- [x] **New first-class entity `ExchangeRate`** &mdash; clean separation; rates have their own lifecycle (effective dates, source, history); reusable across exchanges, invoices, rollups
- [ ] **Embed as fields on `ExchangeFlow`** (`rateToBase`, `baseValueId`) &mdash; rates live only where they apply; simpler but no reuse, no history, no rollup support
- [ ] **Derive from `Offering` pricing** &mdash; treat each priced offering as an implicit rate (e.g. an offering "1h consulting for 200 USD" *is* a rate); zero new entity but very limited (no market currency rates, no history)

**Answer:**

### Q1.2 &mdash; Which value pairs can have a rate?

- [x] **Any `Value` → any `Value`** (no type restriction) &mdash; maximally flexible; supports currency↔currency, service↔currency, product↔currency, even product↔service if the user wants it; the model doesn't enforce semantics, the user decides
- [ ] **Only between values of the same `ValueType`** &mdash; e.g. only PRODUCT↔PRODUCT, only SERVICE↔SERVICE; cleaner but blocks the obvious "1 hour = $200" use case
- [ ] **Introduce a new `ValueType.CURRENCY`** and restrict rates to CURRENCY↔CURRENCY plus *↔CURRENCY &mdash; explicit semantic guard; requires migrating existing &ldquo;currency&rdquo; values (USD, EUR&hellip;) to the new type and changes the meaning of `ValueType`

**Answer:**

### Q1.3 &mdash; Are rates directional?

A rate is either a directed pair (USD→EUR is one row, EUR→USD is a *separate* row) or symmetric (one row, the inverse is implied by `1/rate`).

- [x] **Symmetric: store one direction, compute the inverse** &mdash; one row per unordered pair; simpler; matches how FX is usually quoted; risk of small floating-point asymmetry on round-trip but acceptable for decimals
- [ ] **Directed: store each direction independently** &mdash; allows asymmetric rates (e.g. buy/sell spread, bid/ask, lossy conversions); more rows to manage; users may forget to enter the reverse direction
- [ ] **Symmetric by default, optional override for the reverse direction** &mdash; supports the rare asymmetric case while keeping the common case simple; more code paths

```
Symmetric:
   ExchangeRate(USD → EUR, rate=0.92)
   USD→EUR uses 0.92,  EUR→USD uses 1/0.92 = 1.0869…

Directed:
   ExchangeRate(USD → EUR, rate=0.92)   ← bid
   ExchangeRate(EUR → USD, rate=1.10)   ← ask (spread = 1.20%)
```

**Answer:**

### Q1.4 &mdash; Do rates change over time?

- [x] **Yes &mdash; every rate has an `effectiveAt` timestamp and we keep history** &mdash; querying a rate means "the most recent rate with `effectiveAt <= now` (or some target date)"; supports historical reporting, audit, retroactive corrections
- [ ] **One current rate per pair, overwrite on update** &mdash; simplest; loses history; reports become wrong when a rate changes
- [ ] **Pair of `effectiveFrom` / `effectiveTo` on each row** (closed intervals) &mdash; more explicit but introduces overlap-validation complexity; the &ldquo;latest-wins&rdquo; semantics of option 1 is usually enough

**Answer:**

### Q1.5 &mdash; What does &ldquo;the rate&rdquo; mean &mdash; one global rate or many sources?

- [x] **Single global rate per pair at each point in time** &mdash; one row is the truth; if multiple sources exist, the admin picks which one to record; simplest mental model
- [ ] **Multiple sources per pair** (e.g. ECB, Manual, Stripe) with a `source` discriminator; the consumer chooses which source to use &mdash; explicit provenance; more complex API and UI
- [ ] **Per-`ValueStream` rates** in addition to globals &mdash; allows a stream to override the global rate (e.g. internal transfer pricing); strong but probably premature

**Answer:**

### Q1.6 &mdash; How is the conversion applied at usage sites?

This is about *semantics*, not implementation &mdash; do existing entities (`ExchangeFlow`, `InvoiceItem`, `RecurringFlow`) record the rate they used, or do they just store native amounts and let the read side convert on the fly?

- [ ] **Native amounts only; convert on read** &mdash; flows/items keep their native `valueId` + `quantity`; rollups and reports look up the rate they need at query time; one source of truth (the `ExchangeRate` table); historical reports recompute from history
- [x] **Snapshot the rate on write** &mdash; when a flow or invoice item is created, copy the active rate into a `rateUsed` column; reports are reproducible without consulting the rate history; rate corrections do not affect past records
- [ ] **Hybrid: snapshot on &ldquo;closed&rdquo; records, recompute on open ones** &mdash; e.g. invoices snapshot when marked paid; exchanges snapshot when completed; flexible but adds state-machine coupling

```
Convert-on-read (option 1):
  ExchangeFlow(value=USD, quantity=100)   ←  rate looked up when displayed in EUR

Snapshot-on-write (option 2):
  ExchangeFlow(value=USD, quantity=100,
               rateUsed=0.92, baseValue=EUR, baseAmount=92)
```

**Answer:**

### Q1.7 &mdash; What is the precision of `rate`?

`ExchangeFlow.quantity` is already `decimal(12, 2)`. Rates need more precision (e.g. 1 USD = 0.000023 BTC, or 1 EUR = 1.087324 USD).

- [x] **`decimal(20, 10)`** &mdash; 10 fractional digits; comfortable for FX and most service-rate scenarios; matches Postgres `NUMERIC(20,10)` cleanly
- [ ] **`decimal(24, 12)`** &mdash; more headroom for crypto/long-tail use cases; slightly heavier storage
- [ ] **`decimal(20, 8)`** &mdash; 8 decimals (matches Bitcoin standard); narrower but enough for most cases

**Answer:**

---

When you&apos;ve answered (or accepted the recommendations), reply **&ldquo;Done&rdquo;** (or &ldquo;Done with notes&hellip;&rdquo;) and I&apos;ll append Round 2 &mdash; Shape (fields, validation, units).

---

## Round 2 &mdash; Shape

Round 1 settled the shape of the entity (symmetric, dated, global, decimal(20,10)). This round defines the **fields, validation rules, and edge-case semantics** &mdash; the things a developer would otherwise have to invent at implementation time.

### Q2.1 &mdash; How is &ldquo;same pair&rdquo; enforced under symmetric storage?

Symmetric storage means `(USD, EUR)` and `(EUR, USD)` represent the same logical pair. Without a canonical ordering, an admin could enter both as separate rows and the lookup would be ambiguous.

- [x] **Canonical ordering by `Value.id`** &mdash; on insert, swap fields so `fromValueId < toValueId` (string compare on UUID); inverse rate is stored automatically if the user submitted them flipped; a unique index on `(fromValueId, toValueId, effectiveAt)` enforces no duplicates
- [ ] **No canonical ordering; service-layer dedupe** &mdash; store as submitted, but the lookup queries both directions and picks one (with a tiebreak rule); simpler insert but ambiguous when both rows exist
- [ ] **Canonical ordering by `Value.name`** &mdash; same idea as option 1 but order by display name; readable in raw DB but breaks if a name is renamed

```
User submits:  fromValue=EUR (id=z…), toValue=USD (id=a…), rate=1.087
Stored as:     fromValue=USD (id=a…), toValue=EUR (id=z…), rate=1/1.087 = 0.92
```

**Answer:**

### Q2.2 &mdash; Can a rate exist where `fromValue == toValue`?

- [x] **No &mdash; reject at validation** &mdash; a self-rate is meaningless (always 1); Zod refine + DB CHECK constraint
- [ ] **Yes, allow it; rate must be exactly 1** &mdash; explicit but adds no value; encourages junk rows
- [ ] **Yes, allow any rate** &mdash; no semantic guard; clearly wrong but maximally lenient

**Answer:**

### Q2.3 &mdash; What are the numeric constraints on `rate`?

- [x] **`rate > 0`** &mdash; the only meaningful constraint; zero would imply &ldquo;X is worth nothing&rdquo;, negative is undefined; no upper bound (1 BTC could be 100,000+ USD)
- [ ] **`rate > 0` and `rate != 1`** &mdash; also forbid identity rates between distinct values; in practice 1.0 between two genuinely-distinct values is rare but legitimate (pegged currencies)
- [ ] **`rate >= 0`** &mdash; allow zero to mean &ldquo;worthless&rdquo;; surprising; probably wrong

**Answer:**

### Q2.4 &mdash; What metadata fields does an `ExchangeRate` carry beyond the math?

Pick all that apply (this question is **multi-select** &mdash; tick every box you want).

- [x] **`source`** (string, nullable) &mdash; free-form label like "ECB 2026-05-13", "Manual", "Stripe 2026-05-13"; supports later filtering and audit without requiring a separate sources table
- [ ] **`notes`** (text, nullable) &mdash; longer-form rationale for manual or unusual rates (e.g. &ldquo;negotiated rate per contract X&rdquo;)
- [ ] **`createdBy`** (FK to `User`) &mdash; who entered the rate; useful for audit; can also be derived from a future audit log
- [ ] **`name`** (short label) &mdash; arbitrary friendly name; the `(fromValue, toValue, effectiveAt)` triplet is already a natural identifier; adds clutter

**Answer:**

### Q2.5 &mdash; Can `effectiveAt` be in the future?

- [x] **Yes, freely** &mdash; supports scheduled rate changes (e.g. &ldquo;starting next month, our internal transfer rate is X&rdquo;); the lookup &ldquo;rate at time T&rdquo; naturally ignores rows with `effectiveAt > T`
- [ ] **No, must be `<= now`** &mdash; strictly historical; simpler but blocks scheduling
- [ ] **Yes, with an explicit `scheduled` flag** &mdash; visual distinction in UI; extra column

**Answer:**

### Q2.6 &mdash; What happens when two rows have the same `(fromValueId, toValueId, effectiveAt)`?

- [x] **Reject as a uniqueness violation** &mdash; the unique index `(fromValueId, toValueId, effectiveAt)` enforces it at the DB level; to correct a rate at the same instant, the admin either updates the existing row or inserts a new one with a slightly later timestamp
- [ ] **Allow; latest `createdAt` wins** &mdash; permits &ldquo;corrections&rdquo; without explicit update; ambiguous read semantics
- [ ] **Allow; one is marked `active`, others archived** &mdash; introduces a status column; more bookkeeping

**Answer:**

### Q2.7 &mdash; How does the lookup behave when no rate exists for a pair at time T?

`getRate(fromValue, toValue, at = now)` is the workhorse function. What if the pair has rates but none with `effectiveAt <= at`?

- [x] **Return `null`; let the caller decide** &mdash; callers (rollups, reports, conversion helpers) handle missing rates explicitly: skip, throw, or fall back; no surprising side effects
- [ ] **Fall forward to the earliest future rate** &mdash; pragmatic for &ldquo;we forgot to enter the rate for January&rdquo; cases; but silently distorts historical figures
- [ ] **Throw a `RateNotFoundError`** &mdash; loud; forces every caller into try/catch; clearer at the cost of ergonomics

**Answer:**

### Q2.8 &mdash; How transitive should the lookup be?

If we have `USD → EUR` and `EUR → GBP` but no direct `USD → GBP`, should `convert(100 USD, GBP)` work via the chain?

- [ ] **Yes, always &mdash; compute shortest path through the rate graph** &mdash; powerful (less data entry); risks combinatorial cost on long chains; floating-point error compounds
- [x] **No &mdash; require an explicit direct rate** &mdash; predictable; if you want USD→GBP you enter USD→GBP (or the system suggests one via a single hop hint in the UI); cheaper, simpler, fewer surprises
- [ ] **Yes, but only a single hop via a configurable base value** (e.g. always pivot through USD) &mdash; common FX pattern; one config setting, one extra DB hit per conversion

**Answer:**

---

When you&apos;ve answered, reply **&ldquo;Done&rdquo;** and I&apos;ll append Round 3 &mdash; UI / UX (admin pages, conversion display on existing screens, list/form mockups).

---

## Round 3 &mdash; Snapshot Semantics &amp; Base Value

Q1.6 chose **snapshot-on-write**, so every record that participates in conversion must freeze its rate at creation time. This round nails down *which* records snapshot, *what* they store, and *what happens at the edges* (missing rate, updates, backfill). UI / UX comes next.

### Q3.1 &mdash; Is there a system-wide &ldquo;base value&rdquo;?

The snapshot example shows `rateUsed=0.92, baseValue=EUR, baseAmount=92`. That implies a target value. Where does it come from?

- [x] **Yes &mdash; one configurable system-wide base `Value`** (e.g. an admin picks USD as the company reporting currency); every snapshot stores `(rateUsed, baseAmount)` relative to that single base; rollups across the whole system are trivially aggregatable
- [ ] **No system base &mdash; each snapshot records `(otherValueId, rateUsed, otherAmount)` without a privileged target** &mdash; flexible but rollups must pick a base at query time, which partially defeats the purpose of snapshotting
- [ ] **Per-`ValueStream` base** &mdash; each stream declares its own reporting currency; snapshots are recorded against the stream's base; useful for multi-region setups; more complexity

```
System base = USD

ExchangeFlow:
  value     = EUR
  quantity  = 100
  rateUsed  = 1.0869 (EUR→USD at write time)
  baseAmount = 108.69 USD
```

**Answer:**

### Q3.2 &mdash; What columns get added to records that snapshot?

Pick all that apply (multi-select). These are columns on `ExchangeFlow` (and any other entity that participates per Q3.3).

- [x] **`rateUsed`** (`decimal(20, 10)`, nullable) &mdash; the rate factor that was active at write time
- [x] **`baseAmount`** (`decimal(12, 2)`, nullable) &mdash; the converted amount in the system base value
- [ ] **`baseValueId`** (FK to `Value`, nullable) &mdash; redundant with the system base (Q3.1) but pinned per-row so renaming the base value later doesn&apos;t silently rewrite history; also makes the row self-describing for export/audit
- [ ] **`rateEffectiveAt`** (timestamp) &mdash; pins the exact rate row used; helps audit but the row&apos;s own `createdAt` plus `ExchangeRate.effectiveAt` history already lets you reconstruct it

**Answer:**

### Q3.3 &mdash; Which entities snapshot?

Pick all that apply (multi-select). Each ticked entity gets the snapshot columns from Q3.2.

- [ ] **`ExchangeFlow`** &mdash; the obvious case: an exchange of `5h consulting + 100 USD` needs each flow normalized to compute totals
- [x] **`InvoiceItem`** &mdash; invoices already have a single `currencyId`, but if the currency != system base, the item totals need a base snapshot for cross-invoice rollups
- [x] **`RecurringFlow`** &mdash; rollups over recurring expenses/revenues are the main reason multi-currency support matters; needs base snapshots to aggregate across currencies
- [ ] **`Transaction`** (ledger) &mdash; if and when ledger transactions cross currencies; today they don&apos;t, so deferring keeps scope tight (callable out-of-scope)

**Answer:**

### Q3.4 &mdash; What happens when the rate is missing at write time?

`ExchangeFlow` is being created with `valueId = EUR`, but no `EUR → USD` rate exists for any date ≤ now.

- [x] **Allow the write; store `NULL` in the snapshot columns** &mdash; the record still exists with its native amount; rollups skip / flag rows with `NULL baseAmount`; admin can backfill later (see Q3.6)
- [ ] **Reject the write &mdash; force the admin to enter the rate first** &mdash; data is always consistent; bad UX (creating a flow at 11pm fails because no rate is in the table)
- [ ] **Allow the write; treat missing rate as 1:1** &mdash; never blocks writes; silently distorts reports; clearly wrong

**Answer:**

### Q3.5 &mdash; What happens when a snapshot record is updated?

The user edits an `ExchangeFlow` &mdash; changes the quantity from 100 → 150, or swaps the value from EUR → GBP, weeks after creation.

- [x] **Re-snapshot on any change to `valueId`, `valueInstanceId`, or `quantity`** &mdash; the new snapshot uses the rate active *at edit time* (`now`); preserves the &ldquo;you see what you get&rdquo; principle; pure-metadata edits (description) don&apos;t re-snapshot
- [ ] **Always re-snapshot on every update** &mdash; simpler rule (one branch); risks silently changing baseAmount when the admin only touched the description
- [ ] **Never re-snapshot &mdash; the snapshot is frozen at creation** &mdash; matches a strict accounting view; but changing quantity without updating baseAmount makes the row internally inconsistent

**Answer:**

### Q3.6 &mdash; How does backfill work for rows with `NULL` snapshot (from Q3.4) or rows created *before* the rates feature shipped?

- [ ] **An explicit `POST /exchange-rates/backfill` admin action** &mdash; takes optional filters (entity type, date range); recomputes `rateUsed`/`baseAmount` for matching rows using current rate history; reported in the response (X rows updated, Y still missing); idempotent
- [ ] **Auto-backfill on every rate insert** &mdash; any new rate retroactively fills snapshots for rows with matching value pairs and earlier `createdAt`; magic but surprising (rows change without admin action); risks performance issues on large tables
- [x] **No automatic backfill; admin opens each row and resaves it** &mdash; safe; tedious; impractical at scale

**Answer:**

### Q3.7 &mdash; When the system base value (Q3.1) is changed, what happens to existing snapshots?

- [x] **Existing snapshots are frozen against the *old* base** (`baseValueId` per-row from Q3.2 protects this); rollups choose which base to aggregate in; new writes use the new base; an admin can trigger backfill (Q3.6) to rewrite snapshots against the new base if desired
- [ ] **All existing snapshots are recomputed against the new base immediately** &mdash; consistency wins; one-shot heavy operation; loses history of what was actually frozen
- [ ] **Block changing the base once any snapshots exist** &mdash; safest; brittle if the company actually does change its reporting currency

**Answer:**

---

When you&apos;ve answered, reply **&ldquo;Done&rdquo;** and I&apos;ll append Round 4 &mdash; UI / UX &amp; Integration (admin pages, conversion display on existing screens, seed data, BDD scenarios).

---

## Round 4 &mdash; Integration, UI / UX, Delivery

Scope confirmed: this feature touches **`Invoice` / `InvoiceItem`** and **`RecurringFlow`**. `ExchangeFlow` and ledger `Transaction` are out of scope (snapshot columns will not be added to them). Final round before writing the spec.

### Q4.1 &mdash; What happens if the admin changes the system base `Value` after snapshots already exist?

Because Q3.2 dropped `baseValueId` per row, every existing snapshot becomes ambiguous the moment the base changes (you can&apos;t tell whether a `baseAmount` is in old-base USD or new-base EUR). Q3.6 also rules out automatic backfill. We need to pick a constraint.

- [x] **Block changing the system base value once any snapshot row exists** &mdash; safest; matches the &ldquo;no backfill&rdquo; choice; admin must explicitly opt-in to a separate &ldquo;reset all snapshots&rdquo; action which nulls them out before allowing the base change
- [ ] **Allow the change freely; document that previous snapshots are now in the old base** &mdash; lightweight; risks silent reporting errors weeks later when someone aggregates mixed-base rows
- [ ] **Re-introduce `baseValueId` per row (revisit Q3.2)** &mdash; the clean fix; small storage cost; lets the base change without ambiguity

**Answer:**

### Q4.2 &mdash; Where does the system base `Value` setting live?

Marketlum has no existing &ldquo;system settings&rdquo; table or admin page (config is env-only).

- [x] **New `system_settings` table (key/value)** with a single row keyed `base_value_id` &mdash; reusable for future system-level settings; one new entity, one tiny admin page; matches existing TypeORM/Zod conventions
- [ ] **New dedicated entity `ExchangeRateConfig`** &mdash; one row, one column; explicit but heavy for a single setting
- [ ] **Env var `MARKETLUM_BASE_VALUE_ID`** &mdash; zero schema; bad UX (admin can&apos;t change it without redeploy); diverges from the rest of the admin model

**Answer:**

### Q4.3 &mdash; What is the admin UI layout?

Mockup of the recommended option (top-level entry &ldquo;Exchange Rates&rdquo; in the admin sidebar):

```
/admin/exchange-rates                   ← list (paginated, sorted by effectiveAt DESC)

  ┌──────────────────────────────────────────────────────────────────────────┐
  │  Exchange Rates                                          [+ New rate]    │
  │                                                                          │
  │  Base value: USD  ▾                                                      │
  │                                                                          │
  │  ┌────────────┬───────┬───────────────┬──────────────┬──────────────┐    │
  │  │ Pair       │ Rate  │ Effective at  │ Source       │              │    │
  │  ├────────────┼───────┼───────────────┼──────────────┼──────────────┤    │
  │  │ USD ⇄ EUR  │ 0.92  │ 2026-05-13    │ ECB          │  Edit  Del   │    │
  │  │ USD ⇄ GBP  │ 0.79  │ 2026-05-13    │ ECB          │  Edit  Del   │    │
  │  │ Hour ⇄ USD │ 200   │ 2026-04-01    │ Manual       │  Edit  Del   │    │
  │  │ USD ⇄ EUR  │ 0.90  │ 2026-04-01    │ ECB          │  Edit  Del   │    │
  │  └────────────┴───────┴───────────────┴──────────────┴──────────────┘    │
  └──────────────────────────────────────────────────────────────────────────┘

/admin/exchange-rates/new               ← form
/admin/exchange-rates/[id]              ← edit form
```

- [x] **Top-level `Exchange Rates` page** with a flat history table (one row per `(pair, effectiveAt)`); filter by pair, sort by `effectiveAt`; system-base picker at the top
- [ ] **Nested under each `Value` detail page** (e.g. `/admin/values/USD/rates`) showing only rates involving that value &mdash; better discoverability per value; worse for cross-pair overview
- [ ] **Both** (top-level + per-value tab) &mdash; complete but doubles UI surface

**Answer:**

### Q4.4 &mdash; How do existing pages (Invoice, RecurringFlow) surface the converted base amount?

- [x] **Show inline next to native amount** (e.g. `€100 (≈ $108.69)` in tables; both fields visible in the detail view); rows missing a snapshot show `€100 (no rate)` with a subtle warning icon
- [ ] **New &ldquo;Reporting&rdquo; column toggleable by user** &mdash; cleaner default view; hides multi-currency reality
- [ ] **Only on rollup / dashboard views; record pages stay native-only** &mdash; minimal change to existing pages; less self-documenting

**Answer:**

### Q4.5 &mdash; Should the create / edit form for an Invoice or RecurringFlow show a live conversion preview?

```
Invoice item form:

  Value:     [ EUR ▾ ]
  Quantity:  [ 100   ]
  Unit price:[ 1.00  ]
  Total:     [ 100   ]
                        Preview: ≈ $108.69 USD (rate 1.0869 as of 2026-05-13)
                                 [ ! No rate for EUR→USD ]   ← if missing
```

- [x] **Yes &mdash; show a live converted preview** that resolves the rate as the user types; warns if no rate exists; non-blocking
- [ ] **No preview &mdash; conversion appears only after save** &mdash; simpler; users discover missing rates only after submission
- [ ] **Preview only on the Invoice detail view, not the form** &mdash; minimal form changes; weaker feedback loop

**Answer:**

### Q4.6 &mdash; Seed data &mdash; what does `seed-sample.command.ts` add?

Pick all that apply (multi-select).

- [x] **A handful of currency `Value` rows** (USD, EUR, GBP) if not already present &mdash; required to seed meaningful rates
- [x] **A small set of `ExchangeRate` rows** between those currencies, plus one service↔currency rate (e.g. &ldquo;Hour of consulting&rdquo; ⇄ USD) &mdash; demonstrates the cross-type case
- [x] **Pick USD as the seeded system base value** &mdash; minimal admin onboarding step skipped
- [ ] **Backdated history** (rates at multiple `effectiveAt` per pair) &mdash; nice for demoing history; adds clutter to the sample dataset

**Answer:**

### Q4.7 &mdash; BDD coverage plan

Pick all that apply (multi-select). The strict-BDD rule means every endpoint and major UI behavior gets `.feature` coverage in `packages/bdd/features/`.

- [x] **`packages/bdd/features/exchange-rates/`** with CRUD + list (create, get, update, delete, list with filter/sort) &mdash; ~20 scenarios
- [x] **`packages/bdd/features/exchange-rates/`** lookup-helper scenarios: `getRate at time T`, symmetric inverse, missing rate, self-pair rejection, future-dated rates &mdash; ~10 scenarios
- [x] **New scenarios under existing `invoices/` and `recurring-flows/` feature dirs** covering: snapshot on create, snapshot on edit (re-snapshot when amount/value changes), `NULL` snapshot when no rate exists &mdash; ~10 scenarios total
- [x] **System base value scenarios** (`system-settings/` or `exchange-rates/`): set base, can&apos;t change base while snapshots exist, reset-snapshots-then-change-base flow &mdash; ~5 scenarios
- [ ] **End-to-end browser tests** &mdash; out of repo convention per existing CLAUDE / memory (no full e2e in conversation); skip

**Answer:**

### Q4.8 &mdash; Delivery: one PR or phased?

- [ ] **One PR** containing: ExchangeRate entity + migrations, `system_settings` entity + base-value config, snapshot columns on `Invoice`/`InvoiceItem` and `RecurringFlow`, admin pages, conversion preview, seed data, BDD coverage &mdash; keeps the feature atomic; matches recent project precedent (recurring-flows shipped as a single PR)
- [x] **Two PRs** &mdash; (1) ExchangeRate CRUD + admin page, (2) snapshot wiring on Invoice + RecurringFlow &mdash; smaller diffs; intermediate state where rates exist but aren&apos;t used
- [ ] **Three PRs** &mdash; (1) ExchangeRate + system-settings, (2) Invoice integration, (3) RecurringFlow integration &mdash; finest-grained; most overhead

**Answer:**

---

When you&apos;ve answered, reply **&ldquo;Done&rdquo;** and I&apos;ll consolidate every decision into `specs/002-exchange-rates-specification.md` and commit both files.
