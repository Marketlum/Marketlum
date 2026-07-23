# 019 — API Keys: Specification

> Decision trail: [`019-api-keys-brainstorming.md`](./019-api-keys-brainstorming.md). All rounds were accepted as recommended.

## Overview

User-owned API keys give programmatic clients access to the Marketlum API. A key authenticates as its owner — `request.user` is the owning `User` entity, exactly as with cookie-JWT sessions — so no downstream authorization changes. The plaintext key is shown once at creation, stored only as a SHA-256 hash, and revoked by hard delete. Key management itself is session-only: a request authenticated with an API key cannot create, list, or delete keys.

```
                     ┌───────────────────────────────┐
  Browser session    │ Cookie: token=<JWT>           │──► JwtStrategy ─────► User
                     └───────────────────────────────┘                        │
                                                                              ▼
                     ┌───────────────────────────────┐                 request.user
  Programmatic       │ Authorization: Bearer mlm_…   │──► ApiKeyStrategy ──► User
  client             └───────────────────────────────┘    sha256(token)
                                                          → unique-index lookup
                                                          → expired? → touch lastUsedAt

  AdminGuard = AuthGuard(['jwt', 'api-key'])   ← all existing protected controllers
  SessionGuard = AuthGuard('jwt')              ← /api-keys controller only
```

Out of scope (deferred, see brainstorming Q1.2, Q4.3): scopes/granular permissions, per-key rate limiting, key rotation helpers, admin oversight of other users' keys.

## Domain model

### Entity: `ApiKey` (`api_keys` table)

| Column       | Type            | Constraints                                   |
|--------------|-----------------|-----------------------------------------------|
| `id`         | uuid            | PK, generated                                 |
| `name`       | varchar(100)    | NOT NULL                                      |
| `prefix`     | varchar(12)     | NOT NULL — first 12 chars of plaintext (`mlm_` + 8) |
| `keyHash`    | varchar(64)     | NOT NULL, **UNIQUE index** — SHA-256 hex      |
| `userId`     | uuid            | NOT NULL, FK → `users.id`, `ON DELETE CASCADE`, index |
| `lastUsedAt` | timestamptz     | NULL                                          |
| `expiresAt`  | timestamptz     | NULL (null = never expires)                   |
| `createdAt`  | timestamptz     | `@CreateDateColumn`                           |
| `updatedAt`  | timestamptz     | `@UpdateDateColumn`                           |

No uniqueness on `name` (Q2.6). No soft-delete columns — revocation is hard delete (Q1.6). No cap on keys per user (Q1.4).

### Key generation & verification (in `ApiKeysService`)

- **Generate**: `token = 'mlm_' + crypto.randomBytes(32).toString('base64url')` (~47 chars, 256 bits of entropy).
- **Store**: `prefix = token.slice(0, 12)`, `keyHash = sha256hex(token)` (Node `crypto`, no salt, no bcrypt — deterministic hash enables `WHERE "keyHash" = $1` on the unique index; see Q2.2).
- **Verify** (called by the strategy): reject tokens not starting with `mlm_`; look up by hash; reject if `expiresAt` is non-null and in the past; return the related `User`.
- **Usage touch**: after successful verification, if `lastUsedAt` is null or older than 60 seconds, fire-and-forget `UPDATE api_keys SET "lastUsedAt" = now() WHERE id = $1` with `.catch(() => {})` — a failed touch must never fail the request (Q2.5).

### Zod schemas (`packages/shared/src/api-keys.ts` — new, exported from index)

```ts
export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresAt: z.coerce.date().refine((d) => d > new Date(), 'must be in the future').optional(),
});
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

// API response shapes (types only; hash never leaves the server)
export type ApiKeySummary = {
  id: string; name: string; prefix: string;
  lastUsedAt: string | null; expiresAt: string | null; createdAt: string;
};
export type ApiKeyCreated = ApiKeySummary & { key: string }; // plaintext, create response only
```

### Domain events (`packages/shared/src/events/`)

`ApiKey` joins the primary-entity list (spec 009 pattern): `marketlum.api_key.created` and `marketlum.api_key.deleted`, emitted by the existing `DomainEventSubscriber`. Payload carries the entity as usual **but the subscriber payload must strip `keyHash`** — events must never contain the hash or plaintext. `updated` is not emitted (keys are immutable after creation; there is no update endpoint).

## API surface

All three endpoints live on `ApiKeysController` (`/api-keys`), guarded by **`SessionGuard`** (cookie-JWT only — Q1.3, Q4.1). Every query is scoped to `request.user.id`; other users' keys are indistinguishable from nonexistent (404).

| Method | Path            | Body                       | Response |
|--------|-----------------|----------------------------|----------|
| POST   | `/api-keys`     | `createApiKeySchema` via `ZodValidationPipe` | `201` `ApiKeyCreated` — the **only** time `key` (plaintext) is returned |
| GET    | `/api-keys`     | —                          | `200` `ApiKeySummary[]`, own keys only, ordered `createdAt DESC` |
| DELETE | `/api-keys/:id` | —                          | `204`; `404` if not found **or owned by another user** |

Error cases: `400` on validation failure (empty/long name, past `expiresAt`); `401` if unauthenticated; `401` if authenticated via API key (SessionGuard rejects — passport `jwt` strategy finds no cookie).

### Authentication behavior changes (all existing endpoints)

- A valid `Authorization: Bearer mlm_…` header authenticates any `AdminGuard`-protected endpoint as the key's owner.
- Unknown, malformed, expired, or deleted keys → `401` (deleted keys fail immediately — the hash no longer resolves).
- Cookie-JWT sessions continue to work exactly as before (passport tries `jwt` first, then `api-key`).

## Backend module layout (`packages/core/src/api-keys/`)

```
api-keys/
├── entities/api-key.entity.ts
├── api-keys.controller.ts        ← SessionGuard + ZodValidationPipe
├── api-keys.service.ts           ← generate/hash/verify/touch/CRUD
└── api-keys.module.ts            ← exports ApiKeysService (needed by AuthModule)
```

### Auth wiring changes (`packages/core/src/auth/`)

1. **New strategy** `strategies/api-key.strategy.ts`:
   ```ts
   import { Strategy } from 'passport-http-bearer';

   @Injectable()
   export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
     constructor(private readonly apiKeysService: ApiKeysService) { super(); }
     async validate(token: string) {
       const user = await this.apiKeysService.verify(token); // null on any failure
       if (!user) throw new UnauthorizedException();
       return user;
     }
   }
   ```
   New dependency in `packages/core`: `passport-http-bearer` (+ `@types/passport-http-bearer` dev).
2. **Widen** `guards/admin.guard.ts` (the one-line change that covers all 31 protected controllers):
   ```ts
   export class AdminGuard extends AuthGuard(['jwt', 'api-key']) {}
   ```
3. **New** `guards/session.guard.ts`:
   ```ts
   export class SessionGuard extends AuthGuard('jwt') {}
   ```
4. `AuthModule` imports `ApiKeysModule` and registers `ApiKeyStrategy` as a provider.

### CSRF exemption (`packages/core/src/common/guards/csrf-protection.guard.ts`)

Before the header check, return `true` when `request.headers.authorization` is present (Q4.2 — a cross-site browser request cannot attach an `Authorization` header, so this exemption is exactly as safe as the `x-csrf-protection` check itself).

### Module registration

Register `ApiKeysModule` in `marketlum-core.module.ts` alongside the other domain modules, and add `ApiKey` to the entity list / TypeORM config as done for other entities.

## Database migration

Manual migration (project convention — generator produces drift artifacts): `packages/core/src/migrations/1700000000057-AddApiKeys.ts`, registered in `migrations/index.ts`.

```sql
CREATE TABLE "api_keys" (
  "id"         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name"       character varying(100) NOT NULL,
  "prefix"     character varying(12) NOT NULL,
  "keyHash"    character varying(64) NOT NULL,
  "userId"     uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "lastUsedAt" timestamptz,
  "expiresAt"  timestamptz,
  "createdAt"  timestamptz NOT NULL DEFAULT now(),
  "updatedAt"  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "IDX_api_keys_keyHash" ON "api_keys" ("keyHash");
CREATE INDEX "IDX_api_keys_userId" ON "api_keys" ("userId");
```

## UI / UX

### Page: `/admin/api-keys` (`packages/ui/src/pages/admin/api-keys-page.tsx`)

Sidebar: new entry in the **System** group of `packages/ui/src/layouts/admin-layout.tsx` — `{ href: '/admin/api-keys', label: t('apiKeys'), icon: KeyRound }`. Add `nav.apiKeys` to `packages/ui/messages/en.json` and `pl.json` (plus the page's own message keys).

List (TanStack Table, matching other entity lists), own keys only:

| Name | Key | Last used | Expires | Created | |
|------|-----|-----------|---------|---------|--|
| Zapier integration | `mlm_hGx82f3a…` (monospace) | 2 hours ago / — | Mar 31, 2027 / Never / **Expired** badge (red, when past) | Jul 23, 2026 | Delete |

Empty state: short explanation of what API keys are + "Create API key" button.

### Components (`packages/ui/src/components/api-keys/`)

- `api-keys-table.tsx`
- `create-api-key-dialog.tsx` — two-step (Q3.3):
  1. Form: **Name** (required), **Expires** (optional date picker with 30/90/365-day preset buttons that fill the picker; empty = never).
  2. On success the same dialog swaps to the reveal step: full plaintext key in monospace, **Copy** button (clipboard + "Copied" feedback), warning "This is the only time the full key is shown. Store it somewhere safe.", **Done** closes and refreshes the list. No way back to the form step; dismissing the dialog is the "I've stored it" act.
- `delete-api-key-dialog.tsx` — standard confirm naming the key: "Delete 'Zapier integration'? Requests using this key will fail immediately." (Q3.5 — no type-to-confirm, no undo.)

## Web app wiring + template sync

- `apps/web/src/app/admin/api-keys/page.tsx`:
  ```tsx
  export { ApiKeysPage as default } from '@marketlum/ui';
  ```
- **Template sync (CLAUDE.md rule)**: mirror the same one-line re-export at `packages/create-marketlum-app/template/web/src/app/admin/api-keys/page.tsx`. No other template changes expected (backend and UI ship via `@marketlum/core` / `@marketlum/ui`); bump template dependency versions only if the release process requires it.

## Permissions summary

| Surface | Guard | Notes |
|---|---|---|
| All existing protected controllers | `AdminGuard` = `AuthGuard(['jwt', 'api-key'])` | unchanged call sites; now accept either credential |
| `/api-keys` controller | `SessionGuard` = `AuthGuard('jwt')` | keys cannot manage keys (Q1.3) |
| Auth endpoints (login/logout) | unchanged | |
| CSRF guard | skips requests carrying `Authorization` header | |
| Throttling | existing global `ThrottlerGuard` only (Q4.3) | |

## Seed data

None (Q4.4). Neither `seed:admin` nor `seed:sample` creates API keys — a seeded key would be a well-known credential in every dev database. BDD tests create their own via the service/HTTP.

## BDD test coverage

Feature files in `packages/bdd/features/api-keys/`, step definitions in `apps/api/test/api-keys/` (jest-cucumber `loadFeature` + `defineFeature`, ref-counted shared app, `createAuthenticatedUser()` helper; feature path from the test dir is `../../../../packages/bdd/features/api-keys/…`).

**`management.feature`** (~7 scenarios):
1. Create a key → 201, response contains plaintext `key` starting `mlm_`, plus name/prefix/expiresAt.
2. List keys → shows name, prefix, lastUsedAt, expiresAt, createdAt; contains neither `key` nor `keyHash`.
3. List is scoped — another user's key does not appear.
4. Delete own key → 204, gone from list.
5. Delete another user's key → 404.
6. Create with empty name → 400.
7. Create with past `expiresAt` → 400.

**`authentication.feature`** (~8 scenarios):
1. Valid key on a protected endpoint (e.g. `GET /agents`) → 200, acts as the owner.
2. Unknown/malformed bearer token → 401.
3. Expired key → 401.
4. Deleted key → 401 immediately.
5. Mutation (POST) with API key and **no** `x-csrf-protection` header → succeeds.
6. API-key auth on `/api-keys` endpoints → 401.
7. Cookie-JWT session flows still work unchanged.
8. `lastUsedAt` is set after the key is used.

Expired-key setup: create via API, then backdate `expiresAt` with a raw `UPDATE` (established pattern from spec 018). New total: ~15 scenarios on top of the existing 842+.

## Delivery plan (single PR — Q4.6)

1. `@marketlum/shared`: `createApiKeySchema`, response types, `api_key` event types; **rebuild shared** before API work (`pnpm --filter @marketlum/shared build`).
2. BDD feature files (written first — strict BDD).
3. `@marketlum/core`: `ApiKey` entity + migration `1700000000057-AddApiKeys` + registration.
4. `ApiKeysService` (generate/verify/touch/CRUD) + `ApiKeyStrategy` (`passport-http-bearer` dep) + `SessionGuard` + widen `AdminGuard` + CSRF exemption + `DomainEventSubscriber` addition (strip `keyHash` from payloads).
5. `ApiKeysController` + step definitions → `pnpm test:e2e` green (new suites + full regression, especially auth and CSRF-dependent suites).
6. `@marketlum/ui`: page, table, create/delete dialogs, sidebar entry, `en.json`/`pl.json` messages.
7. `apps/web` route re-export + template mirror; verify with `tsc` + `next build` (no browser e2e, per project convention).
