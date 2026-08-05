# 024 — Rename Agents to Actors

> **Goal:** Rename the core `Agent` concept to `Actor` across the entire stack — database schema and data, shared contracts, API, MCP server, UI, BDD suite, and the create-marketlum-app template — with a full DB migration.

> **Process:** Append-only brainstorming. Each round adds questions with preselected recommendations (`[x]`). Move the `[x]` to override, or write below `**Answer:**` to elaborate. Existing content is never edited.

## Context

"Agent" is one of the two founding entities of Marketlum (with Value Streams removed, arguably *the* central one). The footprint is ~6,800 occurrences across ~479 files:

- **Database — schema**: tables `agents`, `agents_closure` (hierarchy), `agent_taxonomies`, `agent_addresses`; Postgres enum `agent_type_enum`; the `search_vector` tsvector trigger on `agents`; FK columns `agentId` (~349 code refs), `fromAgentId` (~150), `toAgentId` (~131) spread across invoices, invoice_items, orders, agreements, exchanges, accounts, tensions, agreement_templates, files, and more; indexes and constraints named after all of these.
- **Database — data**: `role_permissions.permission` stores strings like `agents.read` / `agents.write` (seeded in migration 058 and editable via the HRBAC UI). A schema rename alone leaves these stale.
- **Shared contracts** (`@marketlum/shared`): `agent.schema.ts`, permission subject `'agents'` in `permissions.ts`, `table-name.enum.ts`, domain event types `marketlum.agent.created|updated|deleted`.
- **API**: `packages/core/src/agents/` module, `/agents` REST routes, `agent-financials.controller.ts` (`/agents/:agentId`).
- **MCP server**: tools `search_agents`, `get_agent`, `get_agent_financials` — the external contract for AI clients; guarded by the tool-level drift test.
- **UI**: `packages/ui/src/components/agents/` (~15 components: pages, map, tree, financials tab, form dialog), `use-agents.ts`, admin pages; web route `apps/web/src/app/admin/agents` mirrored in `packages/create-marketlum-app/template/web/src/app/admin/agents/`.
- **BDD**: feature directories `agents/`, `agent-addresses/`, plus scenario prose across the 912+ test suite.
- **Docs**: historical specs (006, 007, 015, …) reference agents throughout.

Working in our favor: the route drift guard, the MCP tool drift guard, and the HRBAC permission-catalog drift test will all fail loudly on any half-done rename. The term greps cleanly — no `user-agent` or other false positives in the codebase.

```
                 ┌────────────── the rename cuts every layer ──────────────┐
                 │                                                          │
  DB schema ──▶ DB data ──▶ shared ──▶ core ──▶ MCP ──▶ ui ──▶ web ──▶ template ──▶ bdd
  (tables,      (role_      (zod,      (module, (tool   (comp- (routes) (mirror)    (features,
   enums,        permissions  events,    routes)  names)  onents)                     step defs)
   FKs,          rows)        perms)
   triggers)
```

---

## Round 1 — Foundations & compatibility

This round pins down the blast radius: how deep the rename goes, what breaks for existing installs, and what (if anything) gets a compatibility shim.

### Q1. Depth of the rename

The DB layer is the fork in the road: rename everything including Postgres identifiers, or rename only the code/API surface and keep DB names via TypeORM mappings.

- [x] **Full rename, DB included** — tables, columns, enum, triggers, indexes, constraints all become `actor*`. One migration, zero permanent naming split. The right call for a framework others will scaffold from.
- [ ] **Surface-only rename** — code/API/UI say "actor", DB keeps `agents` via `@Entity('agents')` / `@Column({ name: 'agentId' })` mappings. No migration risk, but every future migration, raw SQL query, and debugging session lives with the split forever.
- [ ] **Phased: surface now, DB later** — ship the code rename first, DB migration in a follow-up PR. Spreads risk but doubles the review surface and leaves an inconsistent intermediate state on `master`.

**Answer:**

### Q2. Backward compatibility for existing installs

Marketlum is a framework — projects scaffolded by `create-marketlum-app` have databases with `agents` tables and `agents.*` permission rows, and may have plugins or MCP clients wired to the old names.

- [x] **Clean break, migration ships the upgrade** — no aliases anywhere. Existing installs upgrade by running `pnpm migration:run` (the rename migration handles schema + data); their own code must be updated by hand. Honest for a pre-1.0 framework; aliases would outlive their usefulness.
- [ ] **Transitional aliases for one release** — `/agents` routes 308-redirect to `/actors`, domain events dual-emit `marketlum.agent.*` and `marketlum.actor.*`, MCP keeps `search_agents` etc. as deprecated aliases. Softer landing, but triples the contract surface and the drift guards would need alias-aware exemptions.
- [ ] **Aliases only where cheapest** — REST redirects only (one line in Next/Nest), clean break for events and MCP tools. Middle ground, still leaks the old name into new scaffolds.

**Answer:**

### Q3. Migration mechanics

How the existing migration history is treated. All migrations live in `packages/core/src/migrations/` and ship with the framework.

- [x] **Append one hand-written rename migration** — a new `RenameAgentsToActors` migration doing `ALTER TABLE ... RENAME`, column renames, `ALTER TYPE ... RENAME`, index/constraint renames, trigger recreation, and the `role_permissions` data UPDATE. History stays intact; every existing DB upgrades cleanly. Hand-written per the known `migration:generate` drift problem.
- [ ] **Rewrite history: rename in-place across all 60 migrations** — fresh scaffolds get clean `actors` naming from `InitSchema` onward. But every existing DB's migration ledger no longer matches the source, breaking upgrades — only viable if we declare there are zero external installs.
- [ ] **Both: rewrite history + standalone upgrade script** — clean history for new installs, a documented one-off SQL script for old ones. Most work, two artifacts to test.

**Answer:**

### Q4. Stored permission strings (`role_permissions` data)

Regardless of Q3's choice, rows like `agents.read` exist in every live database, including custom roles created through the HRBAC UI.

- [x] **Data UPDATE inside the same migration** — `UPDATE role_permissions SET permission = regexp_replace(permission, '^agents\.', 'actors.')`. Atomic with the schema rename; custom roles keep working.
- [ ] **Re-seed defaults only** — update the seeded Admin/Member roles, ignore custom roles. Breaks any hand-created role silently; not acceptable.
- [ ] **Runtime aliasing in the permission guard** — guard treats `agents.*` as `actors.*` forever. Avoids the data migration but bakes the old name into the auth path permanently.

**Answer:**

### Q5. Domain event names

`DomainEventSubscriber` emits `marketlum.agent.created|updated|deleted`; plugins may subscribe. Events are in-process only (not persisted), so there is no stored-data concern — just the contract.

- [x] **Rename cleanly to `marketlum.actor.*`** — consistent with Q2's clean break; in-repo subscribers (none currently beyond the bus itself) and plugin examples get updated in the same PR.
- [ ] **Dual-emit both names for one release** — safety net for third-party plugins at the cost of double delivery and an eventual second breaking change when the alias is removed.
- [ ] **Keep `marketlum.agent.*` unchanged** — smallest change but the event vocabulary permanently contradicts the domain model.

**Answer:**

### Q6. Sweep breadth in prose and history

Beyond identifiers: BDD scenario text, UI copy, comments, and the historical `specs/` documents all say "agent".

- [x] **Rename all living text; historical specs stay untouched** — BDD feature prose, UI labels, comments, README/docs all become "actor". Specs 001–023 are a decision-trail archive and keep their original wording (spec 024 itself documents the rename).
- [ ] **Identifiers only, prose stays** — code says `actor`, tests and UI still say "agent". Cheapest, but the codebase argues with itself and BDD features are user-facing documentation.
- [ ] **Everything including historical specs** — total consistency, but rewriting committed decision documents falsifies the historical record.

**Answer:**

---

## Round 2 — Naming surface & migration/delivery mechanics

Round 1 fixed the strategy (full rename, clean break, one migration). This round pins the exact names on each contract surface and how the migration and PR verification are executed. Note: the `agent_type_enum` *values* (`individual`, `organization`, `buyer`, `seller`, `broker`, `virtual`) contain no "agent" — only the type name renames.

### Q7. Route and sub-resource naming

The straightforward mapping, confirmed here so the spec can list routes exhaustively.

| Today | Proposed |
|---|---|
| `GET/POST /agents`, `/agents/:id` | `/actors`, `/actors/:id` |
| `/agents/:agentId/financials` | `/actors/:actorId/financials` |
| `/admin/agents`, `/admin/agents/map`, `/admin/agents/[id]` | `/admin/actors`, `/admin/actors/map`, `/admin/actors/[id]` |
| `agent_addresses` table + nested address routes | `actor_addresses` + same shape under `/actors` |
| `agents_closure`, `agent_taxonomies` | `actors_closure`, `actor_taxonomies` |

- [x] **Adopt the table above as-is** — mechanical 1:1 mapping, plural kebab/snake conventions preserved everywhere.
- [ ] **As above, but keep `agent_taxonomies` / `agent_addresses` table names** — less migration SQL, at the cost of a partial split (rejected direction per Q1).
- [ ] **Different mapping** — specify below.

**Answer:**

### Q8. MCP tool names and AI-client discoverability

Tools `search_agents`, `get_agent`, `get_agent_financials` rename to `search_actors`, `get_actor`, `get_actor_financials`. MCP clients discover tools dynamically, but LLM prompts/configs written against old names may reference them.

- [ ] **Rename + mention the former name in each tool description** — e.g. "Search market actors (formerly agents)…" for one release cycle. Zero contract surface cost, helps both humans and models bridge the rename; drop the mention later.
- [x] **Plain rename, no breadcrumbs** — cleanest descriptions; clients rely purely on dynamic discovery.
- [ ] **Rename + keep old names as hidden aliases** — contradicts Q2's clean break and complicates the tool drift guard.

**Answer:**

### Q9. Index, constraint, and trigger names in the migration

`ALTER TABLE ... RENAME` keeps old index/constraint names (`PK_agents_id`, `IDX_agents_search_vector`, `FK_invoices_fromAgent`, …), and the tsvector trigger/function reference the old table.

- [x] **Rename everything explicitly** — `ALTER INDEX/CONSTRAINT ... RENAME TO` for every `*agent*` identifier, and drop/recreate the search-vector trigger + function under actor names. More SQL, but `\d actors` reads clean and future generated migrations won't churn on name drift (a known `migration:generate` failure mode in this repo).
- [ ] **Rename tables/columns only, leave index/constraint names stale** — shortest migration; leaves `IDX_agents_*` haunting a table called `actors` and invites generate-drift later.
- [ ] **Drop and recreate all indexes/constraints** — clean result but rebuilds indexes on large tables and briefly drops FK enforcement; renames are free, recreation isn't.

**Answer:**

### Q10. `down()` migration

Project convention is a working `down()` (see migration 058).

- [x] **Full symmetric `down()`** — reverses every rename including the `role_permissions` UPDATE. Keeps `migration:revert` honest and is cheap to write since every operation is a rename.
- [ ] **`down()` throws "irreversible"** — less code, but breaks the project's revert convention for no real saving.

**Answer:**

### Q11. Upgrade documentation for framework consumers

A clean break needs a place that tells scaffolded-project owners what to do (run migrations, sweep their own code for `/agents` calls, update MCP client configs, plugin event subscriptions).

- [x] **`UPGRADE.md` at repo root with a spec-024 section** — checklist of consumer-facing breaks (REST routes, permission strings, event names, MCP tools, `@marketlum/shared` exports). Becomes the standing place for future breaking changes.
- [ ] **README section only** — visible but mixes upgrade noise into the intro doc.
- [ ] **Commit/PR message only** — invisible to anyone who installs from npm without reading git history.

**Answer:**

### Q12. Verification strategy for the PR

The rename touches a live-DB migration plus 912+ BDD tests. Standing feedback: no full e2e runs inside the working conversation — use `tsc`/`next build`.

- [x] **In-conversation: builds + targeted suites; pre-merge: one full local `migration:run` + `test:e2e` by you** — Claude verifies with `pnpm --filter` builds, `tsc`, and the renamed `actors`/`actor-addresses` suites plus the three drift guards; you run the full suite and a real migration against a copy of a live DB once before merge. Matches the standing feedback while still exercising the risky migration on real data.
- [ ] **Full e2e in-conversation** — maximum confidence during development, but contradicts the standing feedback and is slow on 912+ tests.
- [ ] **CI only** — no local migration rehearsal against real data; the riskiest artifact (the migration) ships tested only against a fresh schema.

**Answer:**
