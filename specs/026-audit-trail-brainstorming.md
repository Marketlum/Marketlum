# 026 — Audit Trail

> **Goal:** Introduce an audit trail so administrators can review human and AI agent activity on the platform.

> **Process:** Append-only brainstorming. Questions are added in rounds; answers are recorded beneath each question. Existing content is never edited or deleted. Move the `[x]` to change a selection, and/or write after **Answer:** to elaborate.

## Context

- **Domain events already exist** (`EventsModule` in `packages/core/src/events/`): a `DomainEventSubscriber` emits `marketlum.<entity>.<created|updated|deleted>` for 25+ primary entities (plus `marketlum.plugin.<id>.*`) on an in-process `@nestjs/event-emitter` bus. Events are **not persisted** — the only consumer is a logging handler.
- **The envelope has no actor attribution**: `DomainEventEnvelope = { name, occurredAt, payload: { id, code?, entity } }`. Nothing records *who* caused a mutation — this is the central gap an audit trail must close.
- **User types (spec 025)** just landed: users are `human` or `agent`; agents authenticate via admin-provisioned API keys (`ApiKey.userId` → user, `lastUsedAt` tracked) and never hold sessions. Audit entries can therefore distinguish human vs agent by joining the acting user.
- **MCP (spec 023)**: 11 read-only tools over `POST /mcp`, API-key-authed. Agent *reads* leave no trace today beyond `ApiKey.lastUsedAt`.
- Auth: JWT cookie sessions (humans), Passport local/JWT/api-key strategies. Request handlers know the current user (`@CurrentUser()`), but services and the TypeORM subscriber do not.

```
  HTTP request ──▶ Guard (knows user) ──▶ Controller ──▶ Service ──▶ TypeORM save
                                                                        │
                              DomainEventSubscriber (no user context) ◀─┘
                                        │
                                emits marketlum.* ──▶ [not persisted]
```

---

## Round 1 — Foundations

This round settles what the audit trail captures, how entries get their "who", and where they live.

**Q1. What is the capture mechanism for entity mutations?**

- [x] **Persist the existing domain events** &mdash; a new subscriber on the `DomainEventBus` writes an `audit_logs` row per `marketlum.*` event; one choke point already covering all 25+ primary entities and plugin entities, zero per-service changes.
- [ ] **HTTP interceptor on mutating requests** &mdash; captures request/response pairs instead of domain facts; misses seeders/commands and records failed attempts as noise.
- [ ] **Per-service explicit audit calls** &mdash; precise but demands touching every service and stays wrong forever as new services forget it.

**Answer:**

**Q2. How does the acting user reach the audit entry? (Today the TypeORM subscriber has no request context.)**

- [x] **AsyncLocalStorage request context** &mdash; a Nest middleware stores `{ userId, userType, apiKeyId? }` per request in ALS; the domain-event subscriber reads it when building the envelope. Zero signature changes anywhere; entries from seeders/CLI get `actor: system`.
- [ ] **Thread the user through every service call** &mdash; explicit but touches hundreds of signatures; unrealistic to retrofit.
- [ ] **No attribution in v1 (log the what, not the who)** &mdash; defeats the stated goal of reviewing *who* did *what*.

**Answer:**

**Q3. What activity classes are recorded?**

- [x] **Entity mutations + MCP tool calls + auth events** &mdash; mutations from Q1; MCP `tools/call` invocations (tool name + arguments) because agent activity is otherwise invisible (all 11 tools are read-only); login success/failure and logout because "who was here" is core audit fare.
- [ ] **Entity mutations only** &mdash; simplest, but agents' read-only MCP activity — half the stated goal — would leave no trace.
- [ ] **Everything including REST reads** &mdash; complete but floods the log (every list render = entries); read auditing beyond MCP deserves its own decision later.

**Answer:**

**Q4. Where do audit entries live, and how immutable are they?**

- [x] **Append-only `audit_logs` table in the same Postgres** &mdash; INSERT-only via the API surface (no update/delete endpoints); the entity is deliberately NOT a domain-event primary entity (no `marketlum.audit_log.*` events — avoids self-referential loops). DB-level immutability (REVOKE/triggers) is left to operators.
- [ ] **External sink (file/OpenSearch/etc.)** &mdash; operationally heavier and the admin UI would need a second data path; premature before volume proves a problem.

**Answer:**

**Q5. What does an entry store about the change itself?**

- [x] **Event name + entity snapshot reference, not diffs** &mdash; `entityType`, `entityId`, `action`, plus the event's sanitized entity snapshot as `jsonb`; diffs can be computed later from consecutive snapshots. Reuses exactly what events already carry (including the `keyHash` sanitization).
- [ ] **Field-level diffs (before/after)** &mdash; the nicest reading experience, but requires loading the previous state on every mutation — a write amplification the event pipeline doesn't have today.
- [ ] **Event name + ids only, no payload** &mdash; tiny rows, but "what changed" becomes unanswerable, which is most of the value.

**Answer:**

**Q6. Retention?**

- [x] **Keep everything, ship a manual `pnpm audit:prune -- --before <date>` command** &mdash; no silent data loss; operators decide. Volume at current scale (hundreds of mutations/day) is trivial for Postgres.
- [ ] **Automatic TTL (e.g. 90 days)** &mdash; predictable size but silently destroys the record an audit exists to keep; wrong default for a compliance-flavored feature.

**Answer:**

---

## Round 2 — Shape

This round fixes the row shape: one table or three, how the actor survives user deletion, when the write happens, and what metadata rides along.

**Q7. One table for all three activity classes, or separate tables?**

- [x] **One `audit_logs` table with a `category` discriminator** (`mutation` | `mcp_call` | `auth`) &mdash; the admin reviews *activity*, which is one chronological stream; class-specific detail lives in a `context` jsonb column. One list UI, one pagination, one retention story.
- [ ] **Three tables** &mdash; cleaner per-class columns, but every "what did this agent do?" question becomes a three-way UNION with mixed shapes.

**Answer:**

**Q8. How is the actor recorded so entries survive user deletion?**

- [x] **Denormalized snapshot, no FK** &mdash; `actorKind` (`human` | `agent` | `system`), plus nullable `userId` (plain uuid, no FK), `userEmail`, `userName`, `apiKeyId`, `apiKeyName` captured at write time. Deleting a user must not delete or NULL its history — that's the point of an audit trail.
- [ ] **FK to users with `SET NULL`** &mdash; referentially tidy, but a deleted user's entire history collapses into "someone".
- [ ] **FK with `RESTRICT`** &mdash; makes users undeletable once they act; turns the audit trail into a constraint on operations.

**Answer:**

**Q9. When is the audit row written, and what if that write fails?**

- [x] **Post-commit, best-effort** &mdash; the domain bus already emits after the source transaction commits (the subscriber buffers until commit), so the audit insert follows the same timing; if it fails, log loudly and continue — a broken audit sink must not take entity writes down with it.
- [ ] **Same transaction as the mutation (guaranteed capture)** &mdash; the strict-compliance stance, but it requires reworking the post-commit event pipeline and couples every entity write to audit-table health.

**Answer:**

**Q10. What do MCP tool-call entries store?**

- [x] **Tool name + full arguments jsonb + outcome** (`ok` | `error` + error code) &mdash; the tools are read-only and their arguments are search/lookup parameters, low sensitivity; outcome makes failed probing visible.
- [ ] **Tool name only** &mdash; leaner, but "agent searched for X" is exactly what an admin reviewing agent behavior wants to see.

**Answer:**

**Q11. Request metadata on every entry?**

- [x] **`ip` and `userAgent`, nullable** &mdash; standard audit fare, captured by the same ALS middleware; NULL for system/CLI entries. No geo lookup, no fingerprinting.
- [ ] **None** &mdash; less storage, but distinguishing "the agent's key used from a new IP" is a real security review need.

**Answer:**

**Q12. What exactly do auth-event entries record?**

- [x] **Login success, login failure, logout** &mdash; failures record the *attempted* email as plain text in `context` (no user lookup) and never anything password-shaped; successes/logouts link the actor like any other entry. Agent login attempts (always rejected per spec 025) appear as failures with the rejection reason.
- [ ] **Successes only** &mdash; simpler, but failed logins are the single most security-relevant event class.

**Answer:**

---

## Round 3 — UI / UX

This round places the audit trail in the admin and shapes how entries are browsed and read.

**Q13. Where does the audit trail live in the admin?**

- [x] **A top-level "Activity" page** (sidebar, system group, near Users/Roles/API keys) &mdash; the standard data-table pattern (toolbar, pagination, column visibility, perspectives) over `GET /audit-logs`; audit review is a first-class admin task, not a setting.
- [ ] **A tab inside Settings** &mdash; undersells it; settings are for configuration, this is an operational view.
- [ ] **Only per-entity history tabs** &mdash; answers "what happened to X" but not "what has this agent been doing" — the stated goal.

**Answer:**

**Q14. What filters does the list get?**

- [x] **Actor kind, category, user, entity type, date range + text search** &mdash; kind (`human`/`agent`/`system`) and category (`mutation`/`mcp_call`/`auth`) as dropdowns, a user picker, an entity-type dropdown (the 25+ snake names), from/to date inputs, and search matching actor email/name and entity id. Covers "what did this agent do last Tuesday" in one screen.
- [ ] **Category + date only** &mdash; simpler toolbar, but the agent-centric review flow — the feature's reason to exist — needs the actor filters.

**Answer:**

**Q15. How is a single entry inspected?**

- [x] **Detail dialog from the row** &mdash; the row shows the one-line story (when, who, badge for kind, what); the dialog shows the full formatted `context`/entity snapshot as pretty-printed JSON with copy. Matches the repo's dialog-centric admin UX.
- [ ] **Expandable rows inline** &mdash; the users table precedent says the repo favors dialogs; inline JSON blobs make the list jumpy.
- [ ] **Dedicated detail route per entry** &mdash; deep-linkable but heavy for what is one JSON document.

**Answer:**

**Q16. Per-entity history on detail pages (e.g. an actor's page showing its audit tab)?**

- [x] **Not in v1 — global page only, with URL-driven filters** &mdash; the list accepts `?entityType=&entityId=` so any future "history" link is one `<Link>` away; building tabs into 25+ detail pages now is a wide, thin layer better added on demand.
- [ ] **Add an Activity tab to the actor and user detail pages now** &mdash; the two most-reviewed entities, but still doubles this spec's UI surface.

**Answer:**

**Q17. Export?**

- [x] **Reuse the existing `ExportDropdown`** (CSV/JSON of the filtered list) &mdash; the pattern every other data table already has; auditors love CSV.
- [ ] **No export in v1** &mdash; smaller, but "hand the log to compliance" is a predictable ask and the component is already built.

**Answer:**

---

## Round 4 — Integration, security, delivery

Final round: who may read the trail, what else feeds it, how it's tested, and how it ships.

**Q18. Who can read the audit trail?**

- [x] **New `audit` permission resource, `audit:read`** &mdash; gates `GET /audit-logs`; added to `PERMISSION_RESOURCES` so roles can grant it explicitly; wildcard admins get it as always. There is deliberately no `audit:write` — inserts are internal-only.
- [ ] **Piggyback on `users:read`** &mdash; no catalog change, but the trail exposes cross-entity activity far beyond user records; deserves its own grant.

**Answer:**

**Q19. Are plugin entity events (`marketlum.plugin.<id>.*`) captured too?**

- [x] **Yes — same stream** &mdash; the subscriber persists every bus event; `entityType` carries the plugin-prefixed snake name (e.g. `plugin.rdhy.vam_agreement`). Plugin activity is platform activity.
- [ ] **Core entities only** &mdash; smaller filter dropdown, but an agent mutating plugin entities would escape review.

**Answer:**

**Q20. Seed data?**

- [x] **None needed — seeding itself produces the trail** &mdash; `seed:sample` runs through the services, so every seeded entity yields a `system`-actor entry organically (the ALS context is empty in CLI). The demo dataset ships with a realistic-looking activity log for free.
- [ ] **Hand-crafted demo entries (agent MCP calls, logins)** &mdash; prettier demo, but fabricated audit rows in a feature about truthful records send the wrong signal.

**Answer:**

**Q21. BDD coverage — agree the scenario map?**

- [x] **Five feature files, ~15 scenarios** &mdash;
  | Feature file | Scenarios | Covers |
  |---|---|---|
  | `audit/mutation-capture.feature` | 4 | human create/update/delete attribution; agent-keyed REST mutation attributed to the agent + its key |
  | `audit/mcp-capture.feature` | 2 | tool call logged with name/args/outcome; failed call logged with error code |
  | `audit/auth-capture.feature` | 4 | login success; login failure (attempted email, no password); logout; agent login rejection recorded |
  | `audit/query-api.feature` | 4 | filter by actorKind; filter by entityType+entityId; text search; 403 without `audit:read` |
  | `audit/immutability.feature` | 1 | PATCH/DELETE on an entry → 404/405 (no such routes) |
- [ ] **Minimal (capture + list only)** &mdash; leaves attribution — the whole point — asserted nowhere.

**Answer:**

**Q22. Prune command guardrails?**

- [x] **Dry-run by default** &mdash; `pnpm audit:prune -- --before 2026-01-01` prints the would-delete count; only `--execute` deletes; refuses dates less than 30 days in the past without `--force`. Destroying audit history should require deliberate typing.
- [ ] **Immediate delete with confirmation prompt** &mdash; prompts don't survive scripts/CI; flags do.

**Answer:**

**Q23. Documentation & compatibility?**

- [x] **New `concepts/audit-trail.md` + cross-links, no UPGRADE.md entry** &mdash; document the activity classes, actor kinds, the post-commit best-effort semantics (what the trail does NOT guarantee), and the prune command. Purely additive feature; existing clients unaffected.
- [ ] **Fold into the users page** &mdash; buries a first-class feature inside another concept.

**Answer:**

**Q24. Delivery?**

- [x] **Single PR, phased commits** &mdash; shared contracts → migration → ALS request context → event persistence → MCP/auth capture → query API → UI → export/prune/docs. Each phase compiles with its tests green; the ALS middleware phase is the riskiest and lands early.
- [ ] **Two PRs (capture, then UI)** &mdash; the capture PR would ship invisible behavior with no way to review it in the admin.

**Answer:**
