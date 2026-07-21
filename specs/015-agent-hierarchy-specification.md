# 015 — Agent Hierarchy: Specification

> Decision trail: [`015-agent-hierarchy-brainstorming.md`](./015-agent-hierarchy-brainstorming.md) (Q1–Q20).

## 1. Overview

Agents become a **closure-table forest** (Q1, Q2): any agent may optionally have a parent agent, forming many independent trees of arbitrary depth. Any agent type may parent any type (Q3). The hierarchy is **structural and navigational only** in this iteration (Q6) — no subtree roll-ups on related-record tabs; `GET /agents/:id/descendants` ships now as the foundation for a future roll-up spec.

```
Acme Holding            (organization, root, level 0)
├─ Acme Poland          (organization, level 1)
│  ├─ Sarah Palmer      (individual,   level 2)
│  └─ AutoFlow Bot      (virtual,      level 2)
└─ TechNova Solutions   (organization, level 1)
GreenLeaf Partners      (organization, root, level 0)
```

## 2. Domain model

`Agent` (`packages/core/src/agents/entities/agent.entity.ts`) gains the tree decorators used by the four existing trees:

| Addition | Type | Notes |
|---|---|---|
| `@Tree('closure-table')` on entity | — | closure table `agents_closure` |
| `parent` | `@TreeParent()` → `Agent \| null` | FK column `parentId`, nullable |
| `children` | `@TreeChildren()` → `Agent[]` | not persisted as a column |
| `level` | `@TreeLevelColumn()` → `number` | **`DEFAULT 0` on both `agents.level` and any closure `level` column** — TypeORM does not populate level on insert (known gotcha) |

Rules enforced in `AgentsService`:

- **Create**: optional `parentId` — 404 if the parent doesn't exist (Q10).
- **Move** (`PATCH /agents/:id/move`): target parent must exist (404); moving an agent **into itself or its own subtree → 400** (Q16). Note this cycle guard is deliberately stronger than the existing tree services, which lack it.
- **Delete**: **409 while direct children exist** ("Remove or move sub-agents first") — mirrors agreement templates (Q5). Existing RESTRICT FKs (invoices, functional currency) still apply afterwards.
- **Update** (`PATCH /agents/:id`): unchanged; does **not** accept `parentId` (Q10).
- No type-based constraints (Q3).

## 3. Shared package (`@marketlum/shared`)

`packages/shared/src/schemas/agent.schema.ts`:

```ts
// createAgentSchema — add:
parentId: z.string().uuid().nullable().optional(),

// updateAgentSchema — UNCHANGED (no parentId; move endpoint owns it)

// new:
export const moveAgentSchema = z.object({
  parentId: z.string().uuid().nullable(), // null = make root
});

const agentSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(AgentType),
});

// agentResponseSchema — add (Q9):
parentId: z.string().uuid().nullable(),
level: z.number(),
parent: agentSummarySchema.nullable(),          // detail; null in list rows is fine
ancestors: z.array(agentSummarySchema).default([]), // detail only: root → … → direct parent

// new type for GET /agents/tree:
export interface AgentTreeNode {
  id: string; name: string; type: AgentType; level: number;
  image: { id: string; mimeType: string } | null;
  children: AgentTreeNode[];
}
```

List rows (`GET /agents`) populate `parentId` + `level` (+ `parent` summary for the table's Parent column); `ancestors` is populated only by `GET /agents/:id` (Q9).

## 4. API surface

All on the existing `AgentsController` behind `AdminGuard` (default). New/changed endpoints, mirroring `ValueStreamsController` (Q8):

| Method & path | Behavior |
|---|---|
| `POST /agents` | now accepts optional `parentId`; 404 unknown parent |
| `GET /agents` | rows gain `parentId`, `level`, `parent` summary |
| `GET /agents/:id` | gains `parent` + `ancestors` (ordered root-first) |
| `GET /agents/tree` | full forest of `AgentTreeNode`, children sorted by name |
| `GET /agents/roots` | root agents only (list-row shape) |
| `GET /agents/:id/children` | direct children (list-row shape); 404 unknown agent |
| `GET /agents/:id/descendants` | all descendants, flat list; 404 unknown agent |
| `PATCH /agents/:id/move` | body `moveAgentSchema`; 200 with updated detail; 404 unknown agent/parent; **400 self or own-subtree** |
| `DELETE /agents/:id` | **409 if direct children exist**, before existing reference checks |

A move publishes `marketlum.agent.updated` — no new event type (Q14).

## 5. Database (migration `1700000000051-AddAgentHierarchy`, `packages/core/src/migrations/`)

Manual migration (per project convention), registered in `migrations/index.ts`:

```sql
ALTER TABLE "agents" ADD COLUMN "parentId" uuid;
ALTER TABLE "agents" ADD COLUMN "level" integer NOT NULL DEFAULT 0;
ALTER TABLE "agents" ADD CONSTRAINT "FK_agents_parent"
  FOREIGN KEY ("parentId") REFERENCES "agents"("id") ON DELETE NO ACTION;
CREATE INDEX "IDX_agents_parent" ON "agents" ("parentId");

CREATE TABLE "agents_closure" (
  "id_ancestor" uuid NOT NULL,
  "id_descendant" uuid NOT NULL,
  CONSTRAINT "PK_agents_closure" PRIMARY KEY ("id_ancestor", "id_descendant"),
  CONSTRAINT "FK_agents_closure_ancestor" FOREIGN KEY ("id_ancestor")
    REFERENCES "agents"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_agents_closure_descendant" FOREIGN KEY ("id_descendant")
    REFERENCES "agents"("id") ON DELETE CASCADE
);
CREATE INDEX "IDX_agents_closure_ancestor" ON "agents_closure" ("id_ancestor");
CREATE INDEX "IDX_agents_closure_descendant" ON "agents_closure" ("id_descendant");

-- Existing agents become roots (Q7): closure self-rows are REQUIRED
INSERT INTO "agents_closure" ("id_ancestor", "id_descendant")
  SELECT "id", "id" FROM "agents";
```

`down()`: drop `agents_closure`, index, FK, `level`, `parentId`.

## 6. Backend module layout

All within the existing `packages/core/src/agents/`:

- `entities/agent.entity.ts` — tree decorators (see §2)
- `agents.service.ts` — repository becomes `TreeRepository<Agent>`; new methods `findTree`, `findRoots`, `findChildren`, `findDescendants`, `move`; `create` handles `parentId`; `remove` gains the children guard; `findOne` loads `parent` and computes `ancestors` via `findAncestors` (sorted by `level`, self excluded)
- `agents.controller.ts` — new routes per §4 (register `tree`/`roots` **before** `:id`)
- `agent.dto.ts` — Swagger DTO additions

## 7. UI / UX (`@marketlum/ui`)

1. **Agents list page** (Q12, Q17): view toggle **Table ⇄ Tree** (plus existing Map link), mirroring the agreement-templates page. New `agent-tree-view.tsx` / `agent-tree-node.tsx` components render `GET /agents/tree` with expand/collapse, type badges, image thumbnails, click-through; **read-only** (no drag) this spec. Table gains a **Parent** column (parent name, click-through), visible by default, hideable via column visibility and exported.
2. **Agent detail page**:
   - Breadcrumb extends with the ancestor path: `Home / Agents / Acme Holding / Acme Poland / <current>` (each ancestor links to its detail page).
   - New **Sub-agents** tab (first tab after Details) listing direct children via `GET /agents/:id/children` — name, type badge, level-agnostic; row click-through; **"Add sub-agent"** button opens the create dialog with parent preselected and locked (Q11).
   - New **Move** button beside Edit/Delete (Q15) opening a dialog: searchable parent picker (excluding self + own subtree client-side; server enforces too) and a "Make root" option; calls `PATCH /agents/:id/move`.
3. **Agent form dialog** (Q13): create mode gains an optional **Parent agent** select (default from context when opened from Sub-agents tab); edit mode shows the current parent read-only with a hint pointing to Move.
4. **Messages**: EN/PL keys under `agents.*` (`subAgentsTab`, `parent`, `noParent`, `move`, `moveTitle`, `makeRoot`, `addSubAgent`, `treeView`, `tableView`, `moveFailed`, `deleteBlockedChildren`, …).

## 8. Web app wiring & template sync

No new routes — the list/detail pages already exist and ship from `@marketlum/ui`; the tree view is a toggle, not a page. **No `apps/web` or `apps/api` file changes are expected**, so no `packages/create-marketlum-app/template/` sync should be needed; verify at the end per `CLAUDE.md`.

## 9. Seed data (Q19)

`agent.seeder.ts` (invoked by `seed:sample`): after upserting the existing six agents, idempotently arrange: `Acme Corp` → parent of `Sarah Palmer` and `AutoFlow Bot`; `TechNova Solutions` → parent of `James Liu`. Roots: Acme Corp, TechNova Solutions, GreenLeaf Partners. Skip re-parenting when a parent is already set (idempotency).

## 10. BDD test coverage (Q18)

New `packages/bdd/features/agents/agent-hierarchy.feature` (+ `apps/api/test/agents/agent-hierarchy.steps.ts`), ~11 scenarios:

1. Create an agent under a parent (201; response has `parentId` and `level` 1)
2. Create under an unknown parent fails (404)
3. Get direct children of an agent (200; only direct children)
4. Get the full agent tree (roots with nested children)
5. Get descendants of an agent (children + grandchildren, flat)
6. Move an agent to a different parent (200; `level` recalculated; `marketlum.agent.updated` published)
7. Move an agent to root (200; `parentId` null)
8. Move to a non-existent parent fails (404)
9. Move an agent into its own descendant fails (400)
10. Move an agent into itself fails (400)
11. Deleting an agent with sub-agents is rejected (409), succeeds after the child is moved to root

Extend `get-agent-details.feature`: the detail response includes `parent` and the `ancestors` path for a grandchild agent. Existing agent suites must stay green (flat agents ⇒ `parentId` null, `level` 0, empty `ancestors`).

## 11. Out of scope (with decision references)

- **Subtree roll-ups** on Offerings/Exchanges/Agreements/Invoices/Agreement-Templates tabs ("involving Acme or any descendant") — Q6; `descendants` endpoint ships as the hook.
- **Drag-and-drop moves** in the tree view — Q15.
- **Type-based hierarchy constraints** — Q3.
- **Auto-grouping existing agents** in the migration — Q7.
- **A dedicated `agent.moved` event** — Q14.
- Retrofitting the cycle guard onto the other four trees (noted as a latent gap in the brainstorm correction) — worth a separate housekeeping change.

## 12. Delivery plan (single PR, Q20)

1. Feature file `agent-hierarchy.feature` + `get-agent-details.feature` extension
2. Shared schemas (`moveAgentSchema`, response additions) → build `@marketlum/shared`
3. Entity tree decorators + migration `1700000000051` (+ index registration)
4. Service + controller (tree endpoints, move, delete guard, ancestors)
5. Step definitions; run `agents` e2e suites to green (plus a full-suite sanity pass — agents are referenced everywhere)
6. UI: Parent column, tree view toggle + components, Sub-agents tab, Move dialog, form parent picker, breadcrumb ancestors, EN/PL messages → build `@marketlum/ui`, `tsc --noEmit` in `apps/web`
7. Seeder arrangement + seed feature scenario if the seed suite conventions require one
8. Template-sync verification (expected no-op)
