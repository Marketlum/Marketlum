# 020 — HRBAC (Hierarchical Role-Based Access Control), Phase 1: Specification

> Decision trail: [`020-hrbac-brainstorming.md`](./020-hrbac-brainstorming.md). All rounds accepted as recommended except Q1.2: inheritance direction is **parent inherits descendants** (Admin at the tree root).

## Overview

Phase 1 replaces "authenticated = full admin" with hierarchical roles, enforced in the backend for every controller (core and plugin) and both credential types (cookie-JWT sessions and API keys). Users hold many roles; roles grant `resource:action` permissions; a role's effective grants include everything its **descendant** roles grant; a permission check is folded into the existing auth guards so no call site changes. Deny by default; a migration grandfathers every existing user into a system Admin role holding the wildcard `*`. Role-management UI and frontend gating are phase 2.

```
                     Admin (isSystem, *)                 ◄ tree root
                    ▲            ▲
          Operations (+…)      Finance (+…)
                    ▲
      Order Manager (orders:write)
                    ▲
             Viewer (orders:read, invoices:read)

  Effective permissions of a role = own grants ∪ all descendants' grants
  Effective permissions of a user = union over all assigned roles

request ──► AdminGuard.canActivate
              1. passport auth (jwt | api-key)  → request.user      (unchanged)
              2. @AllowAuthenticated on handler/controller? → pass
              3. permission = @RequirePermission ?? infer(route, method)
              4. PermissionsService.getEffectivePermissions(user.id)
              5. has '*' or permission? → handler : 403 Forbidden
```

## Permission model

### Permission strings

`<resource>:<action>` with `action ∈ {read, write}`, plus the wildcard `*`.

- Format (validated in Zod): `/^(\*|[a-z0-9-]+(\.[a-z0-9-]+)?:(read|write))$/`
- Catalog membership (resource exists) is validated in `RolesService` → 400, because plugin resources are only known at runtime.

### Resource catalog

`PERMISSION_RESOURCES` in `@marketlum/shared` (`packages/shared/src/permissions.ts`) — core resources, matching route prefixes:

```
accounts, agents, agreement-templates, agreements, archetypes, channels,
dashboard, exchange-rates, exchanges, files, geographies, invoices, locales,
offerings, orders, perspectives, pipelines, plugins, roles, search,
system-settings, taxonomies, tensions, transactions, users,
value-instances, value-streams, values
```

Notes: `auth` and `api-keys` are deliberately **not** resources (their controllers are `@AllowAuthenticated`, see Enforcement). `folders` is not a resource (aliased to `files`). `roles` is new. Plugin resources (e.g. `rdhy.vam-agreements`) are contributed at runtime: `MarketlumApiPlugin` gains an optional `permissionResources?: string[]` field; `RolesService` validates grants against `PERMISSION_RESOURCES ∪ plugin-contributed resources`.

### Resource inference (in the guard)

| Rule | Example |
|---|---|
| First path segment | `/orders/:id` → `orders`; `/agents/:agentId/addresses` → `agents`; `/exchanges/:id/flows` → `exchanges` |
| Alias map | `/folders` → `files` |
| `/plugins` exactly (plugin management) | `plugins` |
| `/plugins/<id>/<sub>/…` | `<id>.<sub>` — `/plugins/rdhy/vam-agreements` → `rdhy.vam-agreements` |
| `/plugins/<id>` with no sub-resource | `<id>` — `/plugins/nbp/...` top-level routes → `nbp` |

Method → action: `GET`/`HEAD`/`OPTIONS` → `read`; `POST`/`PUT`/`PATCH`/`DELETE` → `write`. No baked-in exceptions; `@RequirePermission` is the override mechanism.

## Domain model

### `roles`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `name` | varchar(100) | NOT NULL |
| `code` | varchar(64) | NOT NULL, UNIQUE, snake_case (spec 008 pattern, immutable after create) |
| `parentId` | uuid | NULL, FK → `roles.id` ON DELETE RESTRICT |
| `isSystem` | boolean | NOT NULL DEFAULT false |
| `createdAt` / `updatedAt` | TIMESTAMP | defaults `now()` |

Hierarchy is a plain `parentId` adjacency list resolved in memory (Q1.1) — no closure table. Cycle prevention on write (Q3.6).

### `role_permissions`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `roleId` | uuid | NOT NULL, FK → `roles.id` ON DELETE CASCADE |
| `permission` | varchar(100) | NOT NULL; UNIQUE (`roleId`, `permission`) |

### `users_roles` (join, event-silent)

`userId` FK → users ON DELETE CASCADE, `roleId` FK → roles ON DELETE RESTRICT, PK (`userId`,`roleId`). Modeled as TypeORM `@ManyToMany` `User.roles` ↔ `Role` with `@JoinTable({ name: 'users_roles' })`.

### Effective-permission resolution

```
getEffectivePermissions(userId):
  roleIds  = SELECT roleId FROM users_roles WHERE userId = $1
  allRoles = SELECT id, parentId FROM roles            (tiny table, one query)
  grants   = SELECT roleId, permission FROM role_permissions
  expanded = roleIds ∪ all transitive DESCENDANTS of roleIds   (Q1.2: parent ⊃ children)
  return Set(grants where roleId ∈ expanded)

check(resource, action, perms): perms.has('*') || perms.has(`${resource}:${action}`)
```

Resolved per request in `PermissionsService` — no cache (Q2.5). Roles are a primary entity emitting `marketlum.role.created/updated/deleted` (Q1.7), so a cache can be added later with event invalidation if ever measured necessary.

## Enforcement

### Guard changes (`packages/core/src/auth/`)

Global guards run before controller guards in NestJS, so the check is folded into the existing guards (Q2.3):

- `PermissionCheckService` (new, in `auth/`): given an `ExecutionContext` + user, reads decorator metadata via `Reflector`, infers resource/action, resolves effective permissions, throws `ForbiddenException` on denial. Shared by both guards.
- `AdminGuard`: `canActivate` = `await super.canActivate(ctx)` (passport `['jwt','api-key']`, unchanged) then `permissionCheck.check(ctx)`.
- `SessionGuard`: same fold over `AuthGuard('jwt')`.
- Both guards now have constructor dependencies — `PermissionsModule` (new, `@Global()`) provides `PermissionsService`/`PermissionCheckService` so guard DI resolves in every module, including plugin modules.

### Decorators (`auth/decorators/`)

- `@RequirePermission('resource:action')` — handler- or controller-level override of the convention.
- `@AllowAuthenticated()` — auth still required, permission check skipped. Applied to: `AuthController.me`, `AuthController.logout`, and the whole `ApiKeysController` (self-service credentials; a key acts as its owner so no escalation is possible — Q2.4).

Unauthenticated → 401 (unchanged). Authenticated but denied → **403**.

### Always-public endpoints

`/auth/login` keeps `LocalAuthGuard` only — untouched by this spec.

## API surface

### Roles CRUD (`RolesController`, `/roles`) — gated by convention (`roles:read` / `roles:write`)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/roles` | — | `200` all roles: `{id, name, code, parentId, isSystem, permissions: string[], createdAt, updatedAt}[]` — no pagination (Q3.1) |
| POST | `/roles` | `createRoleSchema` | `201` role; `400` invalid/unknown permission; `404` missing parent; `409` duplicate code |
| PATCH | `/roles/:id` | `updateRoleSchema` | `200` role; `409` cycle; `409` grant change on `isSystem` role; `404` missing role/parent |
| DELETE | `/roles/:id` | — | `204`; `409` if `isSystem`, users assigned, or child roles exist; `404` unknown |

Grants use full-replace semantics: `permissions: string[]` on the body; service diffs (delete + insert) (Q3.3).

### User-role assignment (`UsersController`) — rides on `users:write`

| Method | Path | Body | Response |
|---|---|---|---|
| PUT | `/users/:id/roles` | `{ roleIds: string[] }` | `200` user with roles; `404` unknown user/role; `409` if the change would leave zero users holding a `*`-granting role (lockout guard, Q3.5) |

### `/auth/me` (Q4.2)

Response gains `roles: {id, name, code}[]` and `permissions: string[]` (effective, resolved via `PermissionsService`). `GET /users` list responses include `roles` summaries.

## Shared package additions (`@marketlum/shared`)

```ts
// permissions.ts
export const PERMISSION_ACTIONS = ['read', 'write'] as const;
export const PERMISSION_RESOURCES = [/* list above */] as const;
export const WILDCARD_PERMISSION = '*';
export const PERMISSION_PATTERN = /^(\*|[a-z0-9-]+(\.[a-z0-9-]+)?:(read|write))$/;
export const permissionSchema = z.string().regex(PERMISSION_PATTERN);
export function permissionFor(resource: string, action: 'read' | 'write'): string;

// schemas/role.schema.ts
export const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  code: codeSchema,
  parentId: z.string().uuid().nullable().optional(),
  permissions: z.array(permissionSchema).default([]),
});
export const updateRoleSchema = createRoleSchema.omit({ code: true }).partial();
export const assignUserRolesSchema = z.object({ roleIds: z.array(z.string().uuid()) });
// + roleResponseSchema and inferred types
```

Events: `RoleCreatedEvent/RoleUpdatedEvent/RoleDeletedEvent` added to `packages/shared/src/events/domain-event.ts` and the `DomainEvent` union.

## Database migration

`packages/core/src/migrations/1700000000058-AddRoles.ts` (manual), registered in `migrations/index.ts`:

1. `CREATE TABLE "roles"` / `"role_permissions"` / `"users_roles"` per the DDL above (+ indexes on `role_permissions.roleId`, `users_roles.roleId`).
2. `INSERT INTO roles (name, code, "isSystem") VALUES ('Admin', 'admin', true)`.
3. `INSERT INTO role_permissions (roleId, permission) VALUES (<admin>, '*')`.
4. `INSERT INTO users_roles SELECT id, <admin> FROM users` — grandfathers every existing user (Q4.1).

`down`: drop the three tables.

## Backend module layout

```
packages/core/src/roles/
├── entities/role.entity.ts            (+ RolePermission entity)
├── roles.controller.ts                ← AdminGuard (convention-gated)
├── roles.service.ts                   ← CRUD, grant diffing, cycle/system/delete rules
├── permissions.service.ts             ← getEffectivePermissions, check
├── role.dto.ts                        (nestjs-zod DTOs for swagger)
└── permissions.module.ts              ← @Global(), exports PermissionsService + PermissionCheckService
```

Plus: `auth/permission-check.service.ts`, `auth/decorators/require-permission.decorator.ts`, `auth/decorators/allow-authenticated.decorator.ts`; edits to `AdminGuard`, `SessionGuard`, `AuthController`, `ApiKeysController` (`@AllowAuthenticated`), `UsersController`/`UsersService` (`PUT /users/:id/roles`, roles on responses), `User` entity (`@ManyToMany` roles), `entities.ts`, `PRIMARY_ENTITIES` (role, no sanitize needed), `marketlum-core.module.ts`, core `index.ts` exports, `MarketlumApiPlugin` interface (`permissionResources?`), plugin-rdhy manifest (contributes `rdhy.platforms`, `rdhy.agents`, `rdhy.vam-agreements`, `rdhy.emc-agreements`), plugin-nbp (contributes `nbp`).

## Seed data

- `seed:admin` (`seed-admin.command.ts`): after creating the admin user, ensure the `admin` role exists (isSystem, `*`) and assign it.
- `seed:sample`: no new sample roles (roles are configuration, not sample data).

## Web app / template

No `apps/web` or template changes in phase 1 (UI is phase 2) — template sync rule not triggered. Note: the web app continues to work because grandfathered/seeded users hold Admin.

## Test infrastructure changes (Q4.3)

`apps/api/test/setup.ts`:

- `cleanDatabase()` truncates all tables — including `roles` — so the Admin role from the migration does **not** survive between scenarios. Therefore:
- `ensureAdminRole()` (new helper): creates-or-returns the `admin` system role with `*` via `RolesService` (service-level, not HTTP, avoiding the chicken-and-egg).
- `createAuthenticatedUser()` gains one step: assign the ensured Admin role to the created user before login. All 858 existing scenarios keep their meaning with zero step-file edits.
- `createUserWithRoles(email, password, roles: {code, permissions, parentCode?}[])` (new): creates roles as described, creates the user, assigns, logs in, returns the cookie — the workhorse of the enforcement scenarios.

## BDD coverage (Q4.5)

`packages/bdd/features/roles/` + `apps/api/test/roles/`:

**`management.feature`** (~10): create role with permissions; create with invalid permission string → 400; create with unknown resource → 400; list roles; update grants (verify replace semantics); reparent a role; cycle → 409; delete with users assigned → 409; delete with child roles → 409; system role delete → 409 and grant change → 409; missing parent → 404.

**`enforcement.feature`** (~11): user with only `orders:read` → `GET /orders` 200 and `POST /orders` 403; user with no roles → 403 on `/orders` but `/auth/me` 200 (and shows empty permissions); wildcard user → allowed everywhere; parent role includes child-role grants (create child with `orders:read`, assign parent, expect 200); union across two assigned roles; API key created by a read-only user → same 403 on write (spec 019 composition); role-less user can still manage own API keys; `/roles` endpoints themselves require `roles:read`/`roles:write`; plugin route (`/plugins/rdhy/platforms`) gated by `rdhy.platforms:read`; removing the last Admin-holding user's roles → 409.

**Drift guard** — `apps/api/test/roles/catalog-drift.steps.ts` (plain jest `describe/it`; the `.steps.ts` suffix is required by the jest `testMatch`, noted in a file comment): bootstraps the app, walks `ModulesContainer` for every controller's `PATH_METADATA`, applies the inference rules, and asserts each resolves to a catalogued/plugin-contributed resource or belongs to an `@AllowAuthenticated`-exempt controller (`auth`, `api-keys`).

## Out of scope (phase 2+)

- Role management UI, user-form role assignment, permission-aware nav/buttons (uses the `/auth/me` payload added here).
- CRUD-granular actions (Q1.3), API-key permission scoping intersecting owner roles (spec 019 deferral), permission caching (Q2.5), configurable default role for new users (Q4.4), deny-overrides/priorities (Q1.4).

## Delivery plan (single PR, Q4.6)

1. Shared: permission catalog + role schemas + event types; rebuild shared.
2. BDD feature files (strict BDD — before implementation).
3. Entities (`Role`, `RolePermission`, `User.roles`), migration `1700000000058-AddRoles`, registrations (entities, migrations, `PRIMARY_ENTITIES`, core module, exports).
4. `PermissionsService` + `PermissionCheckService` + decorators + guard folds + `@AllowAuthenticated` placements + plugin `permissionResources`.
5. `RolesController`/`RolesService`, `PUT /users/:id/roles`, `/auth/me` enrichment.
6. `setup.ts`: `ensureAdminRole()` + `createAuthenticatedUser()` change + `createUserWithRoles()`.
7. New suites + drift test green; `seed:admin` update.
8. **Merge gate: full `pnpm test:e2e` locally** — the guard change touches every endpoint; the full 879+ suite is the safety net (run outside the conversation per project convention).
