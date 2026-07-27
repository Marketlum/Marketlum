# 022 — Legal-Entity Invoicing: Brainstorming

> **Goal:** Distinguish agents that are legal entities from those that are not, enforce that only legal entities issue real (external) invoices, and make sub-agent P&L correct when a parent issues on a sub-agent's behalf — via auto-generated internal mirror invoices and consolidated P&L with intercompany elimination.

> **Process:** Multi-round Q&A. Each question has preselected `[x]` recommendations — move the `[x]` to override, and/or write below the `**Answer:**` line. This file is append-only: new rounds are added at the bottom, existing content is never modified.

## Context

What already exists in the relevant area:

- **Agents** (`packages/core/src/agents/`) form a closure-table tree (`parent`/`children`/`level`, spec 015) and have `type: AgentType` — `ORGANIZATION | INDIVIDUAL | VIRTUAL`. There is no legal-entity concept yet.
- **Invoices** (`packages/core/src/invoices/`) have `fromAgentId` (issuer) and `toAgentId` (receiver), a `market` enum `INTERNAL | EXTERNAL` (default EXTERNAL), unique `(fromAgentId, number)`, and per-item currency snapshots (spec 010): `presentationAmount/Rate`, `fromAgentAmount/Rate`, `toAgentAmount/Rate` computed against each side's functional currency at `issuedAt`.
- **Agent P&L** (`agent-financials.service.ts`, spec 016) is computed purely from invoices: issued = revenue (via `fromAgentAmount`), received = expense (via `toAgentAmount`), in the agent's functional currency, NULL-snapshot invoices counted as `notConvertedCount`.

The problem, concretely:

```
        Agent tree                     Invoices today
        ──────────                     ──────────────
        Company X  (legal entity)      Customer buys from Y, but X must
        └── Sub-agent Y (not legal)    issue the invoice:
            └── ...
                                       [X] ──EXTERNAL──> [Customer]   revenue lands on X
                                       [Y]  (nothing)                 Y's P&L shows zero
```

The chosen direction (from prior discussion): an invoice plays two roles — legal document and economic attribution — and these diverge here. Split them with **internal mirror invoices**: X issues EXTERNAL to the customer, and a linked INTERNAL invoice Y→X carries the economics, so Y's P&L works through the existing machinery, and X's standalone P&L nets to its actual margin. A consolidated view eliminates in-group INTERNAL invoices.

---

## Round 1 — Foundations

This round pins down how legal-entity status is modeled, what is enforced where, and the overall shape of the on-behalf-of mechanism.

### Q1. How should "is a legal entity" be modeled on Agent?

`AgentType.VIRTUAL` already exists and plausibly means "not a legal entity", but ORGANIZATION/INDIVIDUAL don't guarantee legal status either (a brand or division could be modeled as ORGANIZATION).

- [ ] **Explicit `isLegalEntity: boolean` column** — orthogonal to `type`; migration defaults ORGANIZATION/INDIVIDUAL → `true`, VIRTUAL → `false`; user can override per agent. Most flexible, no enum churn.
- [x] **Derive from `AgentType`** (VIRTUAL = not legal, others = legal) — zero schema change, but conflates two concepts and can't model a non-legal ORGANIZATION (e.g. a division).
- [ ] **New `AgentType` values** (e.g. DIVISION) — makes the taxonomy richer but breaks existing type semantics and every place that switches on type.

**Answer:**

### Q2. Where is the legal-entity rule enforced?

- [x] **`fromAgent` of EXTERNAL invoices must be a legal entity** — the issuer is what matters legally; `toAgent` stays unconstrained (external customers are separate agents whose legal status we don't police). INTERNAL invoices are unconstrained on both sides.
- [ ] **Both sides of EXTERNAL invoices must be legal entities** — stricter, but forces users to maintain legal status on counterparty agents they don't control.
- [ ] **Soft warning only, no hard 422** — maximum flexibility, but the invariant that makes mirror invoices trustworthy never actually holds.

**Answer:**

### Q3. Confirm the mechanism: auto-generated internal mirror invoice (vs. attribution field)?

Restating the trade-off from the discussion: an `attributedAgentId` field would be lighter but needs a third snapshot pair per item (attributed agent's functional currency) and leaves X's P&L semantics murky. The mirror invoice reuses all existing snapshot/P&L machinery unchanged.

```
[X] ──EXTERNAL #FV-12──> [Customer]     100 EUR   (legal document)
[Y] ──INTERNAL #MIR-…──> [X]            100 EUR   (economic record, linked to FV-12)

Y standalone P&L:  +100 revenue                    ✓ correct
X standalone P&L:  +100 revenue, −100 expense = 0  ✓ correct (X kept no cut)
X consolidated:    +100 revenue (INTERNAL Y→X eliminated)
```

- [x] **Auto-generated mirror invoice** — user creates the EXTERNAL invoice with an "on behalf of" field; the system creates and links the INTERNAL mirror, keeping it in sync on edits.
- [ ] **Manual mirror invoices** — no new machinery, users create INTERNAL invoices themselves; error-prone and unsynced, defeating the point.
- [ ] **Attribution field instead** — lighter schema, but requires a new snapshot pair, new P&L grouping logic, and an answer to "does X keep or exclude attributed revenue".

**Answer:**

### Q4. Granularity of "on behalf of"?

- [x] **Invoice-level: one `onBehalfOfAgentId` per invoice** — one sub-agent per external invoice; the mirror copies all items. Simple, covers the dominant case. Bundling several sub-agents on one invoice means issuing several invoices.
- [ ] **Item-level attribution** — one external invoice can carry items for several sub-agents (one mirror per sub-agent). More faithful to messy reality, but multiplies sync complexity; can be a later phase.
- [ ] **Both now** (invoice-level default, item-level override) — most complete, largest scope.

**Answer:**

### Q5. Who may issue on behalf of whom?

- [x] **Any legal-entity ancestor of the sub-agent** — X can issue for direct child Y or deeper descendant Z; validated against the closure tree. Covers multi-level trees without being restrictive.
- [ ] **Only the nearest legal-entity ancestor** — accounting-purist (each hop gets its own mirror chain), but multi-hop mirror chains are heavy machinery for little practical gain now.
- [ ] **Any legal entity, no ancestry required** — maximum flexibility, but "issuing on behalf of an unrelated agent" has no economic meaning and invites data errors.

**Answer:**

### Q6. Is consolidated P&L (with intercompany elimination) part of this spec?

Without it, X's subtree revenue double-counts once mirrors exist (X's external revenue + Y's mirror revenue).

- [x] **Yes — `consolidated=true` on the agent financials endpoint** — includes all descendants' invoices, eliminates INTERNAL invoices where both parties are inside the subtree. It's the other half of correctness; scope is contained (one service + one UI toggle).
- [ ] **Separate follow-up spec** — keeps 022 smaller, but ships a period where group-level numbers are misleading.
- [ ] **Only eliminate mirrors, no full consolidation** — narrower, but a consolidated view that ignores non-mirror INTERNAL invoices between subtree members is inconsistent.

**Answer:**

---

## Round 2 — Mirror mechanics

Round 1 settled: legal status derived from `AgentType` (VIRTUAL = not legal), hard enforcement on EXTERNAL `fromAgent`, invoice-level `onBehalfOfAgentId` with an auto-generated INTERNAL mirror from any legal-entity ancestor, consolidation in scope. This round pins down how the mirror behaves as data: numbering, linking, lifecycle, and which fields it copies.

### Q7. How is the mirror invoice numbered?

Numbers are unique per `(fromAgentId, number)`. The mirror's issuer is the sub-agent (Y), so its number lives in Y's sequence.

- [x] **Derived: `MIR-{source number}`** — e.g. source `FV-12` → mirror `MIR-FV-12`; instantly traceable to the source in any list. Collision only if two different issuers use the same number on behalf of the same Y (rare; reject with 409 then).
- [ ] **Reuse the source number verbatim** — simplest, but a mirror labeled `FV-12` issued by Y looks like a real legal document with X's number, which is exactly the confusion this spec exists to avoid.
- [ ] **Independent auto-sequence per sub-agent** (e.g. `INT-Y-0001`) — collision-proof, but requires new sequence machinery (orders-style) and loses at-a-glance traceability.

**Answer:**

### Q8. How are source and mirror linked in the schema?

- [x] **Two columns: `onBehalfOfAgentId` on the source + `mirrorInvoiceId` on the source** — the source EXTERNAL invoice carries both the intent (`onBehalfOfAgentId`) and the pointer to its generated mirror; the mirror is a plain INTERNAL invoice with no special columns. Queries from either side are one join; the mirror stays schema-clean.
- [ ] **`sourceInvoiceId` on the mirror instead** — the mirror points back at the source; source stays clean. Equivalent power, but "find the mirror of this invoice" (the common direction: UI on the source, sync-on-edit) needs a reverse lookup.
- [ ] **Both directions** — redundant FK pair that must be kept consistent; belt-and-suspenders with no query it uniquely enables.

**Answer:**

### Q9. Mirror lifecycle: who owns it, and what happens on source edit/delete?

- [x] **System-owned, read-only, fully regenerated** — the mirror cannot be edited or deleted directly (422). Any update to the source (items, dates, currency, paid, on-behalf agent) regenerates the mirror wholesale; clearing `onBehalfOfAgentId` deletes it; deleting the source deletes it. One code path, no drift possible.
- [ ] **Editable after generation** — allows manual adjustments (e.g. a negotiated internal split), but any source edit then faces a merge problem: overwrite user changes or go stale.
- [ ] **Generated once, then detached** — simplest code, but source edits silently desync the economics, which corrupts exactly the P&L this spec is meant to fix.

**Answer:**

### Q10. Mirror amounts: full value or commission-adjusted?

If X keeps a cut (say 10%), the economically true mirror is 90. But commission structures (percent vs fixed, per-agent vs per-invoice) are a feature of their own.

- [x] **100% mirror; commission out of scope** — mirror copies items verbatim (same quantity, unitPrice, total). X's standalone P&L nets to zero on pass-through deals; a real commission model (per-agent %, per-invoice override) is deferred to a follow-up spec.
- [ ] **Optional per-invoice commission %** — a `commissionPercent` on the source scales mirror unit prices; covers the common case now but bakes in a shape a fuller commission model may contradict.
- [ ] **Free-form mirror total override** — maximum flexibility, minimum integrity; breaks the "mirror = source economics" invariant.

**Answer:**

### Q11. Does the mirror's `paid` status follow the source?

- [x] **Yes — `paid` propagates from source to mirror** — one fact ("the customer paid") drives both records; internal settlement between X and Y is not separately tracked. Consistent with the read-only mirror (Q9).
- [ ] **Independent `paid` on the mirror** — models real intercompany settlement timing, but the mirror is read-only per Q9, so someone would need edit rights just for this flag.
- [ ] **Mirror always `paid: true`** — pragmatic ("it's just bookkeeping"), but lies about receivables in any future cash-flow view.

**Answer:**

### Q12. Which other source fields does the mirror copy?

Snapshot correctness matters: per-item from/to-agent amounts are computed against `issuedAt`, so date choices change Y's recorded revenue.

- [x] **Same `issuedAt`, `dueAt`, `currency`; items verbatim; no file/link/channel/order** — economics identical and snapshotted on the same business date; document-ish fields (PDF file, external link) and workflow links (channel, order) stay on the legal document only.
- [ ] **Copy everything including channel/order links** — mirror shows up in channel/order views too, but then every channel/order rollup double-counts the deal.
- [ ] **Same dates but presentation-currency only** — no; the mirror must be in the source currency for the snapshot machinery to attribute Y's functional-currency amounts correctly.

**Answer:**

---

## Round 3 — UI / UX

The invoice UI lives in `@marketlum/ui`: `invoices-page.tsx` + `columns.tsx` (list with market badge), `invoice-form-dialog.tsx` (create/edit with from/to agent selects), `invoice-detail-page.tsx`, and the agent Financials tab on `agent-detail-page.tsx`. This round decides how on-behalf-of, mirrors, and consolidation surface there.

### Q13. Where does "on behalf of" live in the invoice form?

- [x] **Conditional field in the existing form dialog** — an "On behalf of" select appears only when market = EXTERNAL and the chosen `fromAgent` has non-legal (VIRTUAL) descendants; options are exactly those descendants. Empty/none = normal invoice. One form, no new flow.
- [ ] **Always-visible optional field** — simpler rendering logic, but shows a mostly-irrelevant field on every invoice and allows nonsensical selections that only the server rejects.
- [ ] **Separate "Issue on behalf" action/dialog** — clean separation, but duplicates the whole invoice form for a one-field difference.

**Answer:**

### Q14. How do mirror invoices appear in the invoices list?

- [x] **Listed normally with a "Mirror" badge + filter** — mirrors are real INTERNAL invoices; they show in the list with an extra badge (next to the market badge) and a filter option (all / hide mirrors / only mirrors). Nothing is hidden, double-counting is visually explained.
- [ ] **Hidden by default, toggle to show** — keeps the list "legal documents only", but sums over the visible list stop matching P&L, which reads as a bug.
- [ ] **Only reachable from the source invoice** — maximally clean list, but mirrors become invisible data that users can't audit.

**Answer:**

### Q15. What does the mirror's detail page look like?

- [x] **Read-only detail with a banner linking to the source** — full detail view, edit/delete controls hidden, a banner: "System-generated mirror of FV-12 (Company X) — edits happen on the source." Transparent and consistent with Q9.
- [ ] **Redirect to the source invoice** — fewer screens, but hides the mirror's own numbers (Y's functional-currency totals) which are the point of its existence.
- [ ] **Normal detail with disabled buttons** — visually noisy; disabled controls with no explanation frustrate more than hidden ones.

**Answer:**

### Q16. What does the *source* invoice detail show about its mirror?

- [x] **An "On behalf of" row + link to the mirror** — detail header shows "On behalf of: Sub-agent Y" with the mirror number (`MIR-FV-12`) linking to the mirror detail. Minimal, discoverable.
- [ ] **Embedded mirror summary card** — shows mirror totals inline; richer but duplicates numbers that are identical by construction (100% mirror).
- [ ] **Nothing on the source** — the link exists only in the list; breaks the audit trail in the place users most need it.

**Answer:**

### Q17. How is consolidated P&L exposed on the agent Financials tab?

- [x] **A "Consolidated" switch, visible only when the agent has descendants** — default off (standalone, current behavior); switching on re-fetches with `consolidated=true` and relabels the view "incl. sub-agents, intercompany eliminated". One tab, no layout change.
- [ ] **Side-by-side standalone vs consolidated columns** — maximum information, but doubles the width of every table/chart on the tab for a comparison rarely needed at once.
- [ ] **Separate "Consolidated" tab** — clean, but duplicates the whole Financials UI for one query-param difference.

**Answer:**

### Q18. How does the form prevent illegal issuers (VIRTUAL fromAgent on EXTERNAL)?

- [x] **Client-side guard + server 422** — when market = EXTERNAL, VIRTUAL agents are disabled (with a hint "not a legal entity — issue via a parent") in the fromAgent select; the server 422 from Q2 remains the source of truth (also covers the API-key/import paths).
- [ ] **Server 422 only** — less UI code, but the user discovers the rule only after filling the whole form.
- [ ] **Hide VIRTUAL agents from the select entirely** — cleaner list, but a silently missing agent reads as a data bug; disabled-with-hint teaches the rule.

**Answer:**

---

## Round 4 — Integration, data, delivery

Final round: how the feature interacts with existing invoice-creation paths, the dashboard, events, seed data, and how it ships. Permissions default to the existing guard/HRBAC pattern (invoice permissions already cover create/update, and mirror management rides on invoice update), so no question there unless you want to deviate.

### Q19. What happens to existing EXTERNAL invoices issued by VIRTUAL agents?

- [x] **Enforce on create/update only; legacy rows untouched** — no data migration, no retroactive 422; an old violating invoice trips the rule only when someone edits it (at which point they fix the issuer or add on-behalf). Cheap and non-disruptive.
- [ ] **Migration flags violations** (report/log) — visibility into legacy bad data, but adds machinery for a state users can find via an invoice-list filter anyway.
- [ ] **Hard migration: block deploy until fixed** — guarantees the invariant globally, but can brick real deployments over historical data.

**Answer:**

### Q20. Do the other invoice-creation paths get on-behalf support?

Invoices are also created via PDF import (`invoice-import.service.ts`) and linked from orders (spec 017).

- [x] **Validation everywhere; on-behalf field on the standard create/update API only** — the legal-entity 422 applies to every path (form, API key, import). The `onBehalfOfAgentId` field is settable via the normal create/update endpoints; the import flow doesn't grow an on-behalf UI — users add it by editing the imported invoice. Orders link to the source (legal) invoice as today.
- [ ] **Full on-behalf support in import too** — one more select in the import dialog; small but widens the test surface for a rare combination (imported PDFs are usually received invoices, i.e. expenses).
- [ ] **Validation only on the form path** — leaves the API-key and import paths able to create illegal documents; the invariant becomes decorative.

**Answer:**

### Q21. How does the dashboard avoid double-counting mirrors?

Verified: `dashboard.service.ts` sums `presentationAmount` over **all** invoices with no market filter — every on-behalf deal would count twice (source + mirror).

- [x] **Exclude mirror invoices from dashboard aggregates** — the dashboard shows market-level activity in presentation currency; mirrors are intra-group bookkeeping, so filter them out (`i.id NOT IN (SELECT "mirrorInvoiceId" …)` or equivalent join). Totals keep meaning "real external + genuine internal trade".
- [ ] **Exclude all INTERNAL invoices** — broader stroke, but genuine internal-market trade (the existing INTERNAL concept) is deliberate dashboard content today; changing its meaning is out of scope.
- [ ] **Leave as is, add a disclaimer** — no query change, but a dashboard that knowingly double-counts is worse than one that filters.

**Answer:**

### Q22. Do mirror invoices emit domain events?

The `DomainEventSubscriber` emits `marketlum.invoice.created|updated|deleted` for all invoices.

- [x] **Yes — standard invoice events, no special casing** — mirrors are real invoice rows; subscribers (plugins, future automations) see them like any other. Regeneration shows up as delete+create or update, whichever the implementation does. Zero event-layer changes.
- [ ] **Suppress events for mirrors** — avoids "noise", but makes the event stream lie about the database, breaking any consumer that syncs state.
- [ ] **Dedicated mirror event type** — expressive but adds an event contract for consumers that don't exist yet; the `mirrorInvoiceId` on the source already lets consumers detect mirrors.

**Answer:**

### Q23. Seed data additions?

- [x] **Yes — one on-behalf example in `seed-sample`** — a VIRTUAL sub-agent under an existing ORGANIZATION, plus one EXTERNAL invoice with `onBehalfOfAgentId` (mirror auto-generated by the service), so the badge, banner, consolidated toggle, and dashboard exclusion are all visible after `pnpm seed:sample`.
- [ ] **No seed changes** — smaller diff, but the feature is invisible in a fresh sample environment.
- [ ] **Rich multi-level scenario** (X → Y → Z, several invoices) — better demo, more seed code to maintain; the single example already exercises every path.

**Answer:**

### Q24. Delivery: one spec/PR or split?

Scope so far: `onBehalfOfAgentId` + `mirrorInvoiceId` columns, one migration, validation, mirror generation/sync, financials `consolidated` param, dashboard exclusion, UI (form field, badges, banner, toggle), seed, BDD (rough estimate: ~18–24 scenarios across `invoices/legal-entity`, `invoices/on-behalf-mirror`, `agents/consolidated-financials`, `dashboard` features).

- [x] **Single spec, single PR, backend-first order** — migration → validation → mirror lifecycle → financials/dashboard → UI → seed. The pieces are tightly coupled (UI without mirrors or consolidation without mirrors are half-features); the scope is comparable to spec 010, which shipped as one.
- [ ] **Two PRs: backend then UI** — smaller reviews, mirrors invisible in the UI for a period; acceptable but the template-sync + shared rebuild dance happens twice.
- [ ] **Three phases (enforcement / mirrors / consolidation)** — most incremental, but phase 2 without phase 3 ships the double-counting window Round 1 Q6 chose to avoid.

**Answer:**
