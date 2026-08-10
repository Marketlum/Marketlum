# Spec 026 — Audit Trail

> Decision trail: [`026-audit-trail-brainstorming.md`](026-audit-trail-brainstorming.md) (Q1–Q24, all recommendations accepted).

## Overview

An append-only audit trail records three classes of platform activity — entity mutations, MCP tool calls, and auth events — each attributed to a **human**, **agent**, or **system** actor. Mutations are captured by persisting the existing domain-event stream (post-commit, best-effort); attribution flows from an AsyncLocalStorage request context so no service signature changes. Admins review the trail on a new top-level **Activity** page gated by a new `audit:read` permission.

```
HTTP request ─▶ AuditContextMiddleware (ALS: userId, userType, apiKeyId, ip, UA)
                     │
   Controller ─▶ Service ─▶ TypeORM save ─▶ DomainEventSubscriber (post-commit)
                                                  │ emits marketlum.*
                     ┌────────────────────────────┤
                     ▼                            ▼
        AuditTrailHandler (new)         existing consumers (logging)
             │ reads ALS context
             ▼
        audit_logs (INSERT-only)  ◀── McpAuditHook (tools/call)  ◀── AuthAuditHook (login/logout)
```

## Domain model

### `audit_logs` table (Q4, Q5, Q7, Q8, Q11)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `uuid_generate_v4()` |
| `category` | `audit_category_enum` (`mutation` \| `mcp_call` \| `auth`) | NOT NULL |
| `actorKind` | `audit_actor_kind_enum` (`human` \| `agent` \| `system`) | NOT NULL |
| `userId` | uuid NULL — **no FK** (Q8: entries must survive user deletion) |
| `userEmail` | varchar NULL | denormalized at write time |
| `userName` | varchar NULL | denormalized at write time |
| `apiKeyId` | uuid NULL — no FK | set when the request authenticated via API key |
| `apiKeyName` | varchar NULL | denormalized |
| `entityType` | varchar NULL | snake name incl. plugin prefix (`actor`, `plugin.rdhy.vam_agreement`); NULL for `auth` |
| `entityId` | uuid NULL | NULL for `auth`/`mcp_call` |
| `action` | varchar NULL | `created` \| `updated` \| `deleted` for mutations; tool name for `mcp_call`; `login_success` \| `login_failure` \| `logout` for `auth` |
| `context` | jsonb NOT NULL DEFAULT `'{}'` | mutation: sanitized entity snapshot; mcp_call: `{ arguments, outcome: 'ok'\|'error', errorCode? }`; auth: `{ attemptedEmail?, reason? }` |
| `ip` | varchar NULL | from ALS; NULL for CLI/system |
| `userAgent` | varchar NULL | from ALS |
| `createdAt` | timestamptz NOT NULL DEFAULT now() | |

Indexes: `(createdAt DESC)`, `(actorKind)`, `(category)`, `(userId)`, `(entityType, entityId)`.

**Not a domain-event primary entity** — no `marketlum.audit_log.*` events, no self-referential loops (Q4). No update/delete API routes exist (Q4); the entity has no `@UpdateDateColumn`.

### Shared package (`@marketlum/shared`)

- `enums/audit-category.enum.ts`: `AuditCategory { MUTATION='mutation', MCP_CALL='mcp_call', AUTH='auth' }`.
- `enums/audit-actor-kind.enum.ts`: `AuditActorKind { HUMAN='human', AGENT='agent', SYSTEM='system' }`.
- `schemas/audit-log.schema.ts`:
  - `auditLogResponseSchema` — all columns above, `context: z.record(z.unknown())`, dates as strings.
  - `auditLogsQuerySchema` — pagination fields plus `actorKind`, `category`, `userId`, `entityType`, `entityId`, `from`, `to` (ISO dates), all optional; `search` matches `userEmail`/`userName`/`entityId::text`.
- `permissions.ts`: add `'audit'` to `PERMISSION_RESOURCES` (Q18).
- Unit tests (colocated `*.spec.ts`) for the query schema's date/enum validation.

## Capture pipeline

### 1. Request context (Q2, Q11) — `packages/core/src/audit/audit-context.ts`

`AuditContext` on `AsyncLocalStorage<{ userId?, userEmail?, userName?, userType?, apiKeyId?, apiKeyName?, ip?, userAgent? }>`. A global Nest middleware (`AuditContextMiddleware`, registered in `MarketlumCoreModule`) opens the store per request; the JWT and api-key strategies populate the user fields after validation (one `AuditContext.set(...)` call in each strategy — the only auth-code touch). Outside HTTP (CLI, seeders, tests calling services directly) the store is empty → `actorKind: system` (Q20).

### 2. Mutation capture (Q1, Q9) — `packages/core/src/audit/audit-trail.handler.ts`

An `@OnEvent('marketlum.**')` handler (same wildcard the logging handler uses) mapping each envelope to a row: `entityType`/`action` parsed from the event name, `context` = the envelope's already-sanitized entity payload, actor fields from `AuditContext`. Timing is inherited: the bus emits post-commit, so audit rows are post-commit best-effort — the handler wraps its insert in try/catch and `Logger.error`s on failure without rethrowing (Q9). Plugin events (`marketlum.plugin.**`) are included; `entityType` keeps the plugin prefix (Q19).

### 3. MCP capture (Q3, Q10) — in `packages/core/src/mcp/`

The MCP server factory's `tools/call` execution path gains an `AuditService.recordMcpCall(...)` after each invocation: `action` = tool name, `context.arguments` = the raw arguments, `context.outcome` = `ok` or `error` + `errorCode` (the `McpToolErrorCode`). Actor fields come from the same ALS context (the api-key strategy populated them).

### 4. Auth capture (Q3, Q12) — in `packages/core/src/auth/`

`AuthService`/controller hooks: `login_success` (actor = the user), `login_failure` (`actorKind` from the *attempted* user if found else `system`-less anonymous row with `context.attemptedEmail`; agent rejections get `context.reason: 'agent_login_rejected'`), `logout`. Never store anything password-shaped.

## API surface

| Endpoint | Permission | Behavior |
|---|---|---|
| `GET /audit-logs` | `audit:read` (new resource) | Paginated list, filters per `auditLogsQuerySchema`, default sort `createdAt DESC`. Response rows follow `auditLogResponseSchema`. |
| `GET /audit-logs/:id` | `audit:read` | Single entry (for the detail dialog / deep links). |

No POST/PATCH/DELETE routes (Q4; asserted in BDD).

## Backend module layout

```
packages/core/src/audit/
├── audit.module.ts            # imports TypeOrmModule.forFeature([AuditLog])
├── audit-context.ts           # ALS store + middleware
├── audit-trail.handler.ts     # @OnEvent('marketlum.**') persistence
├── audit.service.ts           # record* internals + query for the controller
├── audit.controller.ts        # the two GET routes, AdminGuard + audit:read
├── entities/audit-log.entity.ts
└── prune (in commands/)       # audit-prune.command.ts
```

`MarketlumCoreModule` registers the module and the global middleware. The api-key and JWT strategies each gain one `AuditContext.set(...)` line.

## Database

Migration `1700000000065-AddAuditTrail.ts` (hand-written; fresh-replay in timestamp order — reference current table names):

```sql
CREATE TYPE "audit_category_enum" AS ENUM ('mutation', 'mcp_call', 'auth');
CREATE TYPE "audit_actor_kind_enum" AS ENUM ('human', 'agent', 'system');
CREATE TABLE "audit_logs" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "category" "audit_category_enum" NOT NULL,
  "actorKind" "audit_actor_kind_enum" NOT NULL,
  "userId" uuid, "userEmail" character varying, "userName" character varying,
  "apiKeyId" uuid, "apiKeyName" character varying,
  "entityType" character varying, "entityId" uuid, "action" character varying,
  "context" jsonb NOT NULL DEFAULT '{}',
  "ip" character varying, "userAgent" character varying,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
);
CREATE INDEX "IDX_audit_logs_createdAt" ON "audit_logs" ("createdAt" DESC);
CREATE INDEX "IDX_audit_logs_actorKind" ON "audit_logs" ("actorKind");
CREATE INDEX "IDX_audit_logs_category" ON "audit_logs" ("category");
CREATE INDEX "IDX_audit_logs_userId" ON "audit_logs" ("userId");
CREATE INDEX "IDX_audit_logs_entity" ON "audit_logs" ("entityType", "entityId");
```

No FKs by design (Q8). `down`: drop table + both enums.

## UI / UX (Q13–Q17)

- **`packages/ui/src/pages/admin/activity-page.tsx`** + **`components/audit/activity-data-table.tsx`**: standard data-table (toolbar, pagination, column visibility, perspectives `table: 'audit'`, `ExportDropdown` CSV/JSON of the filtered list).
- Columns: time, actor (kind badge + name/email), category badge, action, entity (`entityType` + short id), IP (hidden on mobile).
- **`AuditActorBadge`**: `human` → `User` icon, `agent` → `Bot` (consistent with spec 025's `UserTypeBadge`), `system` → `Cog`; neutral styling.
- Toolbar filters (Q14): actorKind, category, user picker, entityType dropdown, from/to date inputs, text search. Filters serialize to the URL (`?entityType=&entityId=&actorKind=…`) so views are deep-linkable (Q16).
- **`AuditEntryDialog`** (Q15): full row detail; `context` pretty-printed JSON with a copy button.
- Sidebar: "Activity" item in the system group, gated by `Can('audit','read')`.
- Messages: EN + PL (`audit.*` namespace: title, filters, badges, dialog labels, export).
- `apps/web`: one thin route re-export `/admin/activity` — **mirror to `packages/create-marketlum-app/template/` if a route file is added** (template-sync rule).

## Permissions (Q18)

`audit` joins `PERMISSION_RESOURCES`. `GET` routes require `audit:read` via the existing guard pattern. No `audit:write` exists anywhere. Catalog-drift test updates accordingly.

## Prune command (Q6, Q22)

`pnpm audit:prune -- --before <ISO date>`: dry-run by default (prints would-delete count), `--execute` performs the delete, dates < 30 days ago require `--force`. Implemented as `audit-prune.command.ts` beside the seeders; wired as a root `package.json` script.

## Seed data (Q20)

None. `seed:sample` runs through services, so seeding organically writes `system`-actor mutation entries.

## BDD test coverage (Q21)

Feature files in `packages/bdd/features/audit/`, steps in `apps/api/test/audit/` (shared-app pattern; API-key + MCP helpers from specs 019/023/025).

| Feature file | Scenarios | Covers |
|---|---|---|
| `audit/mutation-capture.feature` | 4 | human create/update/delete each attributed (userEmail, actorKind=human); agent-keyed REST mutation attributed to the agent + apiKeyName |
| `audit/mcp-capture.feature` | 2 | tool call logged (name, arguments, outcome ok); failed call logged (outcome error + code) |
| `audit/auth-capture.feature` | 4 | login success; login failure with attemptedEmail and nothing password-shaped; logout; agent login rejection with reason |
| `audit/query-api.feature` | 4 | filter by actorKind; filter by entityType+entityId; text search on actor email; 403 without `audit:read` |
| `audit/immutability.feature` | 1 | PATCH/DELETE `/audit-logs/:id` → 404/405 |

**Total: 15 scenarios.** Plus shared unit tests for the query schema.

## Documentation (Q23)

New `apps/docs/docs/concepts/audit-trail.md`: activity classes, actor kinds, attribution mechanics, **explicitly what the trail does not guarantee** (post-commit best-effort — a crashed audit insert loses that entry; DB-level immutability is the operator's job), the prune command, and cross-links to `users.md` (agent activity) and the MCP docs section. No `UPGRADE.md` entry — purely additive.

## Out of scope (with decision references)

- REST read auditing beyond MCP (Q3).
- Field-level before/after diffs (Q5).
- Automatic retention/TTL (Q6).
- External sinks (Q4).
- Per-entity history tabs on detail pages (Q16).
- Geo/IP intelligence or fingerprinting (Q11).
- Same-transaction guaranteed capture (Q9) — revisit if compliance requires it.

## Delivery plan (Q24)

Single PR (`spec/026-audit-trail`), phased commits, each compiling with tests green:

1. Shared: enums, schemas (+ unit tests), `audit` permission resource (+ catalog-drift test update).
2. Migration + entity; fresh-database replay check.
3. ALS request context middleware + strategy population (riskiest — lands early, verified by the attribution scenarios).
4. `AuditTrailHandler` mutation persistence (BDD: `mutation-capture`).
5. MCP + auth capture (BDD: `mcp-capture`, `auth-capture`).
6. Query API (BDD: `query-api`, `immutability`).
7. UI (Activity page, filters, dialog, badges, EN/PL) + template-sync check.
8. Prune command + docs.
