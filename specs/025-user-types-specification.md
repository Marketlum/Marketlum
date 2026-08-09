# Spec 025 — User Types: Human and Agent

> Decision trail: [`025-user-types-brainstorming.md`](025-user-types-brainstorming.md) (Q1–Q20, all recommendations accepted).

## Overview

Users gain an immutable `type` — `human` or `agent` — so AI agents operating the market through the REST API and MCP are first-class, distinguishable identities. Agents cannot log into the web admin (no password, and both auth strategies reject them); they authenticate exclusively through API keys, which admins provision on their behalf. An agent user may optionally *operate as* a market actor of `ActorType.AGENT` via a nullable `actorId` link.

Users (authentication identities) remain distinct from Actors (market participants); this spec connects them with one optional FK and nothing more.

```
  Human ──password──▶ User(type=human) ──JWT cookie──▶ web admin
                         │ owns
                         ▼
                       ApiKey ──Authorization header──▶ REST API / MCP
                         ▲ provisioned by admin (never self-service)
  Agent ─────────────▶ User(type=agent, password=NULL, actorId ─▶ Actor[type=agent] | NULL)
```

## Domain model

### `users` table changes (Q1, Q2, Q4)

| Column | Type | Notes |
|---|---|---|
| `type` | `user_type_enum` (`human` \| `agent`) | NOT NULL, DEFAULT `'human'`; **immutable** after creation |
| `password` | existing column → **nullable** | NULL for agents, required for humans (enforced at the Zod boundary, Q7) |
| `actorId` | `uuid` NULL, FK → `actors(id)` `ON DELETE SET NULL` | agents only; must reference an actor with `type = 'agent'` (Q10) |

### Shared enums & schemas (`@marketlum/shared`)

- `packages/shared/src/enums/user-type.enum.ts`: `export enum UserType { HUMAN = 'human', AGENT = 'agent' }`.
- `createUserSchema` gains `type: z.nativeEnum(UserType).default(UserType.HUMAN)` and `actorId: z.string().uuid().nullable().optional()`, with refinements (Q7):
  - `type = 'human'` → `password` required (existing rules), `actorId` must be absent/null;
  - `type = 'agent'` → `password` must be absent, `actorId` optional.
- `updateUserSchema`: **no `type` field** (immutability, Q5 — a PATCH carrying `type` fails validation); `actorId` updatable only when the target user is an agent (service-enforced 400 otherwise).
- `userResponseSchema` gains `type` and `actorId` (nullable) plus `actor: { id, name, type } | null` summary; flows into `/auth/me` and `marketlum.user.*` event payloads automatically via the entity (Q11).
- New `createAgentApiKeySchema` = existing `createApiKeySchema` (reused as-is for the admin flow).

### Validation rules recap

| Case | Result |
|---|---|
| create agent with password | 400 |
| create human without password | 400 (unchanged) |
| create human with actorId | 400 |
| agent `actorId` → actor of non-`agent` type | 400 ("Actor is not an agent-type actor") |
| PATCH with `type` | 400 (schema rejects unknown/forbidden key) |
| PATCH `actorId` on a human user | 400 |

## Authentication invariants (Q2, Q9)

- **Local (password) strategy** (`packages/core/src/auth/strategies/local.strategy.ts`): before password comparison, reject `type = 'agent'` with 401 — explicit, not via NULL-mismatch.
- **JWT strategy**: after resolving the user, reject `type = 'agent'` with 401 — a forged/stale cookie can never yield an agent session.
- API-key strategy: unchanged; keys of agent users work exactly like human-owned keys, permissions still come solely from HRBAC roles (Q6).

## API surface

### Changed

- `POST /users` — accepts `type` + `actorId` per the schema above.
- `PATCH /users/:id` — `actorId` updatable for agents; `type` immutable.
- All user reads (`GET /users`, `GET /users/:id`, `GET /auth/me`) — carry `type`, `actorId`, `actor` summary.
- `GET /users` gains an optional `type` query filter (`?type=agent`) for the UI filter (Q13).

### New — admin-managed agent keys (Q8)

On `UsersController` (existing guards + HRBAC):

| Endpoint | Permission | Behavior |
|---|---|---|
| `POST /users/:id/api-keys` | `users:write` | Target must be `type = 'agent'` else 400. Creates a key owned by the target user; response contains the plaintext key **once** (same shape as self-service create). |
| `GET /users/:id/api-keys` | `users:read` | Metadata only (name, prefix, `lastUsedAt`, `createdAt`) — never key or hash. Agent targets only (400 otherwise). |
| `DELETE /users/:id/api-keys/:keyId` | `users:write` | Revokes; 404 if the key doesn't belong to the target user. |

Implementation: thin delegation to the existing `ApiKeysService` (already keyed by `userId`); no service duplication. The self-service `/api-keys` routes are untouched (humans only in practice; agents have no session to call them with).

## Backend module layout

- `packages/core/src/users/entities/user.entity.ts` — `type`, `actorId`, `actor` relation (`ManyToOne(Actor, { nullable: true, onDelete: 'SET NULL' })`); `password` column `nullable: true`.
- `packages/core/src/users/users.service.ts` — create/update: agent-actor validation (mirror the `assertCurrencyValue` pattern → `assertAgentActor(actorId)`); type filter in `findAll`.
- `packages/core/src/users/users.controller.ts` — the three `/users/:id/api-keys` routes.
- `packages/core/src/auth/strategies/local.strategy.ts`, `jwt.strategy.ts` — agent rejection (Q9).
- Domain events: no wiring changes — `user` is already a primary entity; payloads pick up the new columns (Q11). Password is excluded the same way it is today.

## Database

Migration `packages/core/src/migrations/1700000000064-AddUserTypes.ts` (hand-written; must replay on a fresh DB — reference current table names):

```sql
CREATE TYPE "user_type_enum" AS ENUM ('human', 'agent');
ALTER TABLE "users" ADD "type" "user_type_enum" NOT NULL DEFAULT 'human';   -- Q3: existing rows become human
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;
ALTER TABLE "users" ADD "actorId" uuid;
ALTER TABLE "users" ADD CONSTRAINT "FK_users_actor" FOREIGN KEY ("actorId")
  REFERENCES "actors"("id") ON DELETE SET NULL;
CREATE INDEX "IDX_users_type" ON "users" ("type");
```

`down`: drop index, FK, columns, then the enum type. Register in `migrations/index.ts`.

## UI / UX (Q13–Q16)

- **`UserTypeBadge`** (`packages/ui/src/components/users/user-type-badge.tsx`): `Bot` lucide icon for agents, neutral badge; mirrors `ActorTypeBadge`.
- **`users/columns.tsx`**: type badge column.
- **`users-page.tsx`**: Human/Agent filter dropdown beside search (drives `?type=`).
- **`user-form-dialog.tsx`**: type selector (radio/select) at top — `human` → password field; `agent` → optional agent-actor select (options = actors with `type='agent'`). Edit mode: type displayed read-only.
- **Agent keys section**: expandable area on agent rows of the users table — create key (plaintext-once dialog, reuse the pattern from `api-keys-page.tsx`), metadata list, revoke with confirm. Rendered only for `type = 'agent'` and gated by `Can` (users:write for mutations).
- **`change-password-dialog`**: hidden for agent users.
- Messages: EN + PL — `users.typeHuman`, `users.typeAgent`, `users.type`, `users.operatesAs`, `users.agentKeys.*` (section title, create, revoke, plaintext-once warning, empty state).

## Permissions

Existing HRBAC guards; no new resources. Agent-key routes use the `users` resource (Q8 table above). Type has zero effect on authorization (Q6).

## Web app wiring & template sync (Q19)

`apps/web` users/api-keys admin routes are thin re-exports from `@marketlum/ui` — expected **no change**; verify during implementation and mirror to `packages/create-marketlum-app/template/` only if a route file is actually touched (CLAUDE.md/AGENTS.md rule).

## Seed data (Q12)

`seed:sample`: one agent user — name "Acme Pricing Agent", email `pricing-agent@acme.example`, `type='agent'`, `password=NULL`, `actorId` → the seeded "Acme Pricing Agent" actor (which `actor.seeder.ts` already creates), a modest read-role assignment, **no API key**. `seed:admin` unchanged.

## BDD test coverage (Q18)

Feature files in `packages/bdd/features/`, steps in `apps/api/test/` (shared-app pattern, `createAuthenticatedUser()`; API-key helpers from spec 019).

| Feature file | Scenarios | Covers |
|---|---|---|
| `users/user-types.feature` | 5 | agent create (no password) 201; agent create with password 400; human create without password 400; PATCH `type` 400; legacy create-user still defaults to human |
| `users/agent-actor-link.feature` | 3 | link to agent-type actor 201; link to organization actor 400; actor deletion → `actorId` NULL |
| `auth/agent-login-rejected.feature` | 2 | password login as agent 401; JWT cookie minted for an agent user rejected 401 |
| `users/agent-api-keys.feature` | 5 | admin creates key (plaintext once) 201; human target 400; list metadata; revoke; non-admin 403 |
| `mcp/agent-key-works.feature` | 1 | MCP tool call with an agent's key succeeds under the agent's role grants |

**Total: 16 scenarios.**

## Documentation (Q19)

- `apps/docs/docs/concepts/users.md` (or the closest existing page): the Human/Agent distinction, the users-vs-actors clarification, agent lifecycle (create → provision key → operate).
- API-keys and MCP docs pages: the admin-provisioned agent key flow.
- No `UPGRADE.md` entry — strictly additive.

## Out of scope (with decision references)

- Attribution surfaces: MCP `initialize` metadata, request-log enrichment, per-agent dashboards (Q17).
- Agent-specific permission ceilings — roles remain the only authority (Q6).
- Behavioral coupling of `actorId` (e.g. scoping MCP responses to the linked actor) (Q10).
- Heuristic type backfill for existing users (Q3).
- Dedicated Agents admin page (Q5, Q13).

## Delivery plan (Q20)

Single PR (`spec/025-user-types`), phased commits, each compiling with its tests green:

1. Shared: `UserType` enum, schema changes + refinements, response shapes (+ unit tests for the refinements — pure logic, colocated `*.spec.ts`).
2. Migration + entity changes; fresh-database replay check.
3. Auth: local/JWT agent rejection (BDD: `auth/agent-login-rejected.feature`).
4. Users service/controller: create/update rules, type filter, agent-actor validation (BDD: `user-types`, `agent-actor-link`).
5. Admin agent-key routes (BDD: `agent-api-keys`, `mcp/agent-key-works`).
6. UI: badge, filter, adaptive form dialog, agent keys section, EN/PL messages.
7. Seeds + docs.
