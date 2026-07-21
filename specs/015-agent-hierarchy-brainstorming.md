# 015 — Agent Hierarchy: Brainstorming

> **Goal:** Make Agents hierarchical, so that agents (organizations, individuals, virtual agents) can be arranged in parent/child structures.

> **Process:** Append-only Q&A. Each round adds questions with preselected recommendations (`[x]`). Move the `[x]` to override, or write below `**Answer:**` to elaborate. Existing content is never edited.

## Context

- `Agent` (`packages/core/src/agents/entities/agent.entity.ts`) is **flat** today: `name`, `type` (`organization | individual | virtual`), `purpose`, main/general taxonomies, image, addresses, `functionalCurrencyId`. No parent reference.
- The codebase has four established **closure-table trees** (TypeORM `@Tree('closure-table')`): taxonomies, value streams, agreements, agreement templates — each with `parentId`, `@TreeLevelColumn` (`level`), move endpoints (`PATCH :id/move`), `tree`/`roots`/`:id/children` endpoints, and tree-view UIs. A known gotcha: `level` columns need `DEFAULT 0` (TypeORM doesn't populate them on insert).
- Agents are the **most referenced entity** in the system: offerings (`agentId`), exchanges (`exchange_parties`, flow from/to), agreements (`agreement_parties`), invoices (`fromAgentId`/`toAgentId`, RESTRICT), agreement templates (`agentId`), value streams (`agentId` owner), accounts, channels, recurring flows, addresses. Deletion semantics must respect that.
- Agent UI: list page with data table + map view, and a detail page with tabs (Details, Values, Offerings, Exchanges, Agreements, Invoices, Agreement Templates, Addresses).
- `Agent` is a primary entity — domain events `marketlum.agent.*` are published on create/update/delete.

```
Today:                          Proposed:
agents (flat)                   Acme Holding        (organization)
├─ Acme Corp                    ├─ Acme Poland      (organization)
├─ Acme Poland                  │  ├─ Jan Kowalski  (individual)
├─ Jan Kowalski                 │  └─ Warsaw Lab    (virtual)
└─ Warsaw Lab                   └─ Acme Corp        (organization)
```

---

## Round 1 — Foundations

This round pins down what "hierarchical" means structurally: the modeling pattern, tree shape, constraints, and what the hierarchy is *for*.

**Q1. How should the hierarchy be modeled?**

- [x] **Closure-table tree (like value streams / taxonomies)** — reuse the proven `@Tree('closure-table')` pattern: efficient subtree queries, `level` column, same endpoints/UI conventions as the four existing trees.
- [ ] **Plain `parentId` adjacency only** — lighter (one nullable FK), but subtree/descendant queries need recursive CTEs and diverge from the house pattern.
- [ ] **Separate membership join entity (agent-to-agent M:N with roles)** — models matrix organizations (one agent in several groups), but is a different concept than a hierarchy and much heavier across UI and queries.

**Answer:**

**Q2. What tree shape is allowed?**

- [x] **A forest** — many independent root agents, each optionally with descendants; matches how taxonomies/value streams work and how unrelated companies coexist in one market.
- [ ] **One single mandatory root** — everything under one umbrella agent; simple but wrong for a marketplace of unrelated organizations.
- [ ] **Max two levels (parent → children)** — cheap mental model, but arbitrary and the closure table gives deeper nesting for free.

**Answer:**

**Q3. Should agent `type` constrain the hierarchy?**

- [x] **No structural constraints** — any type may parent any type (an organization containing individuals, virtual teams containing individuals, etc.); keep flexibility, semantics stay in the user's hands.
- [ ] **Individuals cannot have children** — intuitively appealing ("a person isn't a container"), but blocks valid cases like a sole trader owning a virtual team, and adds validation surface.
- [ ] **Parent must be organization or virtual** — stricter version of the above; same trade-off, more rules to test.

**Answer:**

**Q4. Can an agent be re-parented (moved) after creation?**

- [x] **Yes, freely, with cycle prevention** — mirror the existing `PATCH :id/move` endpoints (agreements, agreement templates, value streams): move to another parent or to root; reject moves into own subtree.
- [ ] **Set-once at creation** — simpler, but corporate structures change (acquisitions, reorgs) and every other tree in the app is movable.

**Answer:**

**Q5. What happens when an agent with children is deleted?**

- [x] **Block deletion while children exist (409)** — mirrors agreement templates ("remove children first"); safest for the most-referenced entity in the system, and deletion is already guarded by RESTRICT FKs from invoices.
- [ ] **Children are promoted to roots** — convenient, but silently restructures the tree and diverges from the existing tree entities.
- [ ] **Cascade delete the subtree** — dangerous: children carry invoices/exchanges/agreements that RESTRICT deletion anyway, so cascades would fail halfway.

**Answer:**

**Q6. What is the hierarchy *for* in this iteration — structure only, or aggregation semantics too?**

- [x] **Structure + navigation only (this spec)** — parent/children visible in UI, tree view, breadcrumbs; the related-record tabs (invoices, exchanges, …) keep showing only the agent's own records. Roll-ups ("invoices of Acme incl. subsidiaries") become a later spec.
- [ ] **Include subtree roll-ups now** — "involving Acme or any descendant" filters on invoices/exchanges/agreements tabs; valuable but multiplies scope across every search endpoint (each needs a `withDescendants` variant).
- [ ] **Structure + a single "include descendants" toggle on the agent detail tabs only** — middle ground; still touches five search endpoints and their BDD suites.

**Answer:**

**Q7. Where do existing agents land after the migration?**

- [x] **All existing agents become roots** — `parentId NULL`, `level 0`; zero data risk, users build structure incrementally.
- [ ] **Attempt auto-grouping (e.g. by main taxonomy)** — clever but wrong guesses are worse than a flat start.

**Answer:**

---

## Round 2 — API & data shape

Round 1 settled on a closure-table forest with move support. This round pins down the endpoint surface, response shapes, and where the tree appears in payloads. For reference, the richest existing tree API is value streams: `GET /value-streams/tree | /roots | /:id/children | /:id/descendants`, `PATCH /:id/move`.

**Q8. Which tree endpoints should `AgentsController` gain?**

- [x] **Full value-stream suite** — `GET /agents/tree`, `GET /agents/roots`, `GET /agents/:id/children`, `GET /agents/:id/descendants`, `PATCH /agents/:id/move`; maximal parity with the house pattern, and `descendants` is what a future roll-up spec will need anyway.
- [ ] **Minimal: `:id/children` + `:id/move` only** — enough for the detail page and reorganizing, but the list page then can't render a full tree view without N+1 calls.
- [ ] **Only `parentId` on create/update, no tree endpoints** — cheapest, but pushes tree assembly onto the client and diverges from every other tree in the app.

**Answer:**

**Q9. How does the hierarchy appear in agent responses?**

- [x] **List rows: `parentId` + `level`; detail: parent summary `{id, name, type}` + `ancestors` array** — list stays light; the detail page gets everything needed for a breadcrumb path (Acme Holding / Acme Poland / Jan Kowalski) in one request.
- [ ] **`parentId` + `level` everywhere, no ancestors** — breadcrumbs would need one extra request per ancestor level.
- [ ] **Embed `children` summaries in the detail response too** — convenient but duplicates the `:id/children` endpoint and bloats the payload for large orgs.

**Answer:**

**Q10. How is the parent changed?**

- [x] **`parentId` accepted on `POST /agents` (create under a parent); re-parenting only via `PATCH /agents/:id/move`** — exact parity with value streams/agreement templates; cycle-prevention lives in one endpoint, and the generic `PATCH /agents/:id` stays hierarchy-agnostic.
- [ ] **Also allow `parentId` in the generic `PATCH /agents/:id`** — one fewer endpoint to call from forms, but duplicates move validation and diverges from the other four trees.

**Answer:**

**Q11. How do children surface on the agent detail page?**

- [x] **A new "Sub-agents" tab** — consistent with the page's tab-per-relation design (Offerings, Exchanges, …); shows a table of direct children with type badges, click-through, and an "Add sub-agent" button that opens the create dialog with the parent preselected.
- [ ] **Inline card in the Details tab** — visible immediately, but the Details tab is already two cards and large orgs would dominate it.
- [ ] **Only via the global tree view** — no per-agent children list; weakest navigation.

**Answer:**

**Q12. What happens to the agents list page?**

- [x] **Add a tree view toggle alongside the existing table and map views** — mirrors the agreement-templates page (table ⇄ tree); tree view renders the forest from `GET /agents/tree` with type badges and drag-free expand/collapse.
- [ ] **Indent rows in the existing table by `level`** — cheap, but pagination breaks tree perception (children may land on other pages).
- [ ] **Table stays flat; tree is a separate page (like `/agents/map`)** — viable, but a toggle is the established pattern and one page fewer.

**Answer:**

**Q13. Does the create/edit agent dialog get a parent picker?**

- [x] **Create dialog: optional "Parent agent" select; edit dialog: read-only parent display with a hint to use Move** — matches Q10 (move endpoint owns re-parenting) and keeps the edit form honest.
- [ ] **Parent select in both create and edit** — contradicts Q10 unless edit calls move under the hood; hidden complexity.
- [ ] **No parent in dialogs; children only added from the parent's Sub-agents tab** — workable but surprising when creating from the global list.

**Answer:**

**Q14. What domain events fire on a move?**

- [x] **`marketlum.agent.updated`** — a move is an update to the agent's placement; consumers already subscribe to `updated`, no new event type in `@marketlum/shared`.
- [ ] **A dedicated `marketlum.agent.moved` event** — more precise, but no existing tree publishes move-specific events and it grows the event taxonomy for one consumer-less case.

**Answer:**

---

## Round 3 — Validation, tests, seed & delivery

Last round: the guard rails, test plan, and rollout details. For reference, the value-stream move endpoint returns 404 for a missing target parent, and its service throws `BadRequestException` (400) when moving into the own subtree.

**Q15. How does the user trigger a move in the UI?**

- [x] **A "Move" action on the agent detail page (button beside Edit/Delete) opening a dialog with a parent picker + "make root" option** — explicit, discoverable, works for deep trees; the tree view stays read-only in this spec.
- [ ] **Drag-and-drop in the new tree view** — nice, but drag targets get fiddly in large forests and it doubles the tree component's complexity; can be layered on later.
- [ ] **Both from day one** — maximal UX, maximal scope.

**Answer:**

**Q16. Validation statuses for bad moves (mirroring value streams)?**

- [x] **404 unknown target parent · 400 move into own subtree or into itself** — exact parity with the existing tree services; no new conventions.
- [ ] **409 for subtree/self moves** — arguably "conflict", but diverges from the four existing trees.

**Answer:**

**Q17. Does the agents table gain a Parent column?**

- [x] **Yes, visible by default, hideable via column visibility** — the hierarchy is the point of this feature; the flat table should show it, and perspectives can hide it.
- [ ] **Yes, but hidden by default** — discoverable only via the columns dropdown; undersells the feature.
- [ ] **No column; tree view is the only place** — the table then lies about structure.

**Answer:**

**Q18. How is BDD coverage organized?**

- [x] **One new `agent-hierarchy.feature` (~10 scenarios: create under parent, unknown parent 404, children, tree, descendants, move to parent/root, cycle 400, self 400, delete-blocked 409) + extend `get-agent-details.feature` with parent/ancestors assertions** — keeps the hierarchy behavior in one narrative file, mirrors how move/tree features exist per entity elsewhere.
- [ ] **Scatter scenarios across the existing agent feature files** — harder to read the hierarchy story end-to-end.

**Answer:**

**Q19. Seed data?**

- [x] **Extend `seed:sample` to arrange the existing sample agents into one small hierarchy (one holding root, two children, one grandchild), idempotently** — instantly demonstrates tree view, breadcrumbs and the Sub-agents tab on seeded installs.
- [ ] **No seed changes** — feature invisible on fresh sample data.

**Answer:**

**Q20. Delivery shape?**

- [x] **Single PR, BDD-first order: feature files → schema/entity/migration → service/controller → step defs green → UI (tree view, tabs, dialogs, move) → seed** — matches how every feature in this repo has shipped; the change is cohesive and mid-sized.
- [ ] **Two PRs (backend, then UI)** — reviewable in smaller bites, but the halves are only meaningful together.

**Answer:**

> **Correction to the Round 3 intro:** on closer reading, `ValueStreamsService.move` only validates the target parent (404) — it has **no own-subtree/cycle guard**. The 400-on-cycle behavior recommended in Q16 is therefore an *improvement over* the existing trees, not parity with them. (Also noteworthy: value-stream deletion cascades its subtree, while agreement templates block — Q5's chosen "block" mirrors agreement templates.)
