# 020 — HRBAC (Hierarchical Role-Based Access Control), Phase 1: Brainstorming

> **Goal:** Replace the "authenticated = full admin" model with hierarchical roles: users hold roles, roles grant `resource:action` permissions and inherit from parent roles, and a guard enforces them across all controllers (core and plugin) for both session and API-key credentials. Phase 1 is backend enforcement only; role-management UI and frontend gating are phase 2.

> **Process:** This document is append-only. Each round of questions is appended below the previous one. For every question, the recommended option is preselected with `[x]`; move the `[x]` to override, and/or write elaboration after `**Answer:**`. Existing content is never edited or deleted.

## Context

What exists today:

- **Every authenticated user is an admin.** `User` has no role fields; `AdminGuard` (`packages/core/src/auth/guards/admin.guard.ts`, since spec 019 `AuthGuard(['jwt', 'api-key'])`) is applied per-controller on all protected controllers, and passing it grants everything.
- **Two credential types resolve to the same thing**: cookie-JWT sessions and API keys (spec 019) both set `request.user` to a full `User` entity. API keys act as their owner, so any permission model applied to `request.user` covers both automatically.
- **Route prefixes are a clean resource map**: `accounts`, `agents`, `agreements`, `api-keys`, `orders`, `invoices`, … plus non-entity prefixes `dashboard`, `search`, `system-settings`, `auth`, and plugin routes shaped `plugins/<pluginId>/<resource>` (e.g. `plugins/rdhy/vam-agreements`).
- **Established patterns**: Zod catalogs/schemas in `@marketlum/shared`; TypeORM closure-table trees (channels, taxonomies, agents); domain events per primary entity with a `sanitize` hook; manual migrations; strict BDD; `SessionGuard` for session-only endpoints.

The enforcement flow being added:

```
request ──► AdminGuard (jwt | api-key) ──► request.user: User
                                                  │
                                                  ▼
                                    PermissionsGuard
                                    resource ← route prefix ("/orders/…" → orders)
                                    action   ← HTTP method  (GET → read, else write)
                                                  │
                        effective permissions = union over user.roles + ancestors
                                                  │
                             grant? ──► handler        deny? ──► 403 Forbidden
```

---

## Round 1 — Foundations

This round pins down what roles and permissions *are*: hierarchy semantics, granularity, and the default-deny posture.

### Q1.1 — Role hierarchy representation

Roles form a tree. How is it stored and traversed?

- [x] **Plain `parentId` self-FK, resolved in memory** — the roles table is tiny (tens of rows, depth 2–3); load all roles once and walk ancestors in the service. No closure-table machinery, trivial to reason about, cycle check on write.
- [ ] **TypeORM closure-table (like channels/taxonomies)** — established pattern, but built for deep/wide trees and drags in the `@TreeLevelColumn` gotchas for a table that will hold a dozen rows.
- [ ] **Flat roles, no hierarchy (defer "H" of HRBAC)** — simplest, but inheritance is the point of this spec; retrofitting parents later touches resolution logic everywhere.

**Answer:**

### Q1.2 — Inheritance direction

```
        Viewer  (orders:read, invoices:read)
          ▲
   Order Manager  (+ orders:write)
          ▲
        Admin  (+ everything else)
```

- [ ] **A role inherits its ancestors' permissions (child = superset)** — you assign the single most-senior role a person needs; "Order Manager" automatically includes everything "Viewer" can do; matches the mental model of seniority.
- [x] **A role inherits its descendants' permissions (parent = superset)** — equivalent in power but inverted authoring: the tree reads top-down from Admin, and adding a junior role changes what senior roles can do implicitly.
- [ ] **No inheritance, hierarchy is organisational only** — the tree becomes decoration; effective permissions must be assigned redundantly per role.

**Answer:**

### Q1.3 — Permission granularity

- [x] **`read` / `write` per resource** — `orders:read`, `orders:write`; matches the stated need ("read orders without writing them"), maps 1:1 onto HTTP methods for the convention guard, and splitting `write` into create/update/delete later is purely additive.
- [ ] **Full CRUD (`read`/`create`/`update`/`delete`)** — finer control nobody has asked for; quadruples the permission matrix and weakens the clean method→action convention (PATCH vs PUT vs POST edge cases).
- [ ] **Per-endpoint permissions** — maximal precision, unmanageable catalog (~150 handlers), and every new endpoint is a catalog change.

**Answer:**

### Q1.4 — Roles per user

- [x] **Many-to-many, effective permissions = union** — a user can be "Order Manager" + "Accountant"; union semantics are simple and never *remove* access by adding a role.
- [ ] **Single role per user** — simpler join, but forces creating combination roles ("Order Manager + Accountant") that multiply as needs cross.
- [ ] **Many-to-many with priority/override ordering** — enables deny-overrides, which nothing needs; ordering semantics are a permanent tax on understanding.

**Answer:**

### Q1.5 — The admin grant

- [x] **Wildcard permission `*`** — a role holding `*` passes every check, including resources added by future specs and plugins; the seeded Admin role holds exactly one row.
- [ ] **Explicit row per resource:action** — no special cases in the checker, but every new resource requires backfilling grants to every admin-ish role or admins silently lose access.
- [ ] **`isSuperadmin` boolean on the role** — a second code path in the guard for what `*` expresses inside the normal one.

**Answer:**

### Q1.6 — Default posture for users with no roles

- [x] **Deny by default** — a user with no roles (or roles granting nothing relevant) gets 403 on everything except a small always-allowed set (`/auth/login`, `/auth/logout`, `/auth/me`); this is the point of access control, and the migration protects existing users by granting them Admin (see delivery round).
- [ ] **Allow by default, roles only restrict** — "restrictive roles" invert RBAC semantics and make it impossible to reason about what a role grants.
- [ ] **Deny by default including `/auth/me`** — breaks the web app shell (`getMe` gates the admin layout) for everyone mid-rollout; `/auth/me` reveals only the user's own identity.

**Answer:**

### Q1.7 — Are roles a primary entity (domain events)?

- [x] **Yes — `marketlum.role.created/updated/deleted`** — joins `PRIMARY_ENTITIES` like the other 25; role changes are exactly what an audit subscriber wants, and phase 2 (or a cache) can invalidate on these events. User-role assignments ride on `marketlum.user.updated`-style events only if the join is saved through the user; the join table itself stays event-silent like other joins.
- [ ] **No events** — saves a registry entry but makes permission changes invisible to the event bus, blocking cache invalidation later.

**Answer:**

---

## Round 2 — Enforcement mechanics

Round 1 accepted with Q1.2 overridden to parent-inherits-descendants (Admin at the tree root). This round fixes how the guard actually decides: catalog, resource inference, guard placement, overrides, and resolution.

### Q2.1 — Permission catalog source of truth

- [x] **Explicit `PERMISSION_RESOURCES` list in `@marketlum/shared`** — one exported constant naming every resource (`orders`, `invoices`, … `dashboard`, `search`, `files`), used by Zod to validate grants and by phase 2 to render the matrix; a test asserts every `@Controller` prefix resolves to a catalogued resource so the list can never silently drift.
- [ ] **Derive from `PRIMARY_ENTITIES`** — misses real route resources that aren't entities (`dashboard`, `search`, `system-settings`) and couples the permission model to the event registry.
- [ ] **No catalog; any string validates** — typo'd grants (`ordes:read`) silently do nothing; unfindable bugs.

**Answer:**

### Q2.2 — Resource inference rules

| Route | Resource |
|---|---|
| `/orders`, `/orders/:id/…` | `orders` |
| `/agents/:agentId/addresses` | `agents` (first segment wins) |
| `/exchanges/:id/flows` | `exchanges` |
| `/folders` | `files` (small alias map) |
| `/plugins` (plugin mgmt) | `plugins` |
| `/plugins/rdhy/vam-agreements` | `rdhy.vam-agreements` |

- [x] **First path segment, plus an alias map and `plugins/<id>/<sub>` → `<id>.<sub>`** — sub-resources ride on their parent (addresses are part of agents); plugin routes get their own namespaced resources so a role can grant RDHY access without core access; the alias map handles the two oddballs (`folders`→`files`).
- [ ] **Every distinct prefix is its own resource** — `agents/:agentId` and `exchanges/:id/flows` become confusing standalone resources nobody thinks of as separate.
- [ ] **Collapse all plugin routes to one `plugins.<id>` resource** — coarser (can't grant read on VAM agreements without EMC agreements); acceptable but loses precision plugins already encode in their prefixes.

**Answer:**

### Q2.3 — Guard placement

NestJS runs global guards **before** controller guards, so a global `PermissionsGuard` would execute before `AdminGuard` has set `request.user`.

- [x] **Fold the permission check into `AdminGuard` itself** — `canActivate` = passport auth (unchanged), then resolve + check the permission. Every existing controller and every plugin controller gets enforcement with zero call-site edits, and nothing can forget it. `SessionGuard` gets the same check (it shares a small base class or helper).
- [ ] **Append `PermissionsGuard` per controller (`@UseGuards(AdminGuard, PermissionsGuard)`)** — clean separation of concerns but ~31 edits and every future controller is a chance to silently skip authorization.
- [ ] **Global guard that re-reads the JWT/API key itself** — duplicates credential handling in a second place; drift hazard.

**Answer:**

### Q2.4 — Overrides and always-allowed endpoints

- [x] **Two tiny decorators: `@RequirePermission('res:action')` (handler/controller override) and `@AllowAuthenticated()` (skip the permission check, auth still required)** — the convention covers ~everything; `@AllowAuthenticated` marks self-service endpoints: `/auth/me`, `/auth/logout`, and the `/api-keys` controller (keys act as their owner, so a read-only user minting a key gains nothing — no escalation path).
- [ ] **Only `@RequirePermission`, no skip decorator** — forces inventing fake permissions for self-service endpoints (`me:read`) that every role must then remember to include.
- [ ] **Gate `/api-keys` behind an `api-keys` resource too** — defensible, but it means a freshly-scoped role must always remember `api-keys:write` for its users to use the API at all; friction without a security payoff.

**Answer:**

### Q2.5 — Where effective permissions are resolved

- [x] **`PermissionsService` queried per request** — guard calls `getEffectivePermissions(userId)`: one query for the user's role ids, one for all roles + grants (tiny table), then in-memory descendant walk and union. No caching, no invalidation bugs; optimize only if measured.
- [ ] **In-memory cache invalidated by `marketlum.role.*` events** — correct eventually, but adds cross-request state and a subtle failure mode (stale grants after a missed event) for a table of ~dozens of rows.
- [ ] **Embed permissions in the JWT at login** — zero queries per request but stale until re-login; revoking a permission must not wait for cookie expiry.

**Answer:**

### Q2.6 — HTTP method → action mapping

- [x] **`GET`/`HEAD`/`OPTIONS` → `read`; `POST`/`PUT`/`PATCH`/`DELETE` → `write`** — exact, no exceptions in the current API surface (search and export endpoints are GETs); anything future that breaks the convention (e.g. a POST-based search) takes a one-line `@RequirePermission('x:read')`.
- [ ] **Per-method table with per-route exceptions baked into the guard** — encodes today's quirks into the guard where nobody will find them; the decorator override is the visible place for exceptions.

**Answer:**

---

## Round 3 — Role management API

Round 2 accepted as recommended. This round shapes the endpoints for managing roles and assignments. Note: these endpoints gate themselves through the same convention — `/roles` requires `roles:read`/`roles:write`, `/users/:id/roles` rides on `users:write` — no special-casing needed.

### Q3.1 — Endpoint set for roles

- [x] **Flat CRUD: `GET /roles`, `POST /roles`, `PATCH /roles/:id`, `DELETE /roles/:id`** — the list returns every role with `parentId` and grants (the table is tiny; no pagination, no search); phase 2 builds the tree client-side from `parentId`. Matches the locales controller's minimalism.
- [ ] **CRUD + `GET /roles/tree` + `GET /roles/:id/effective-permissions`** — server-side conveniences phase 2 can compute from the flat list; premature surface area.
- [ ] **Full paginated search like big entities** — roles will number in the dozens; pagination is ceremony.

**Answer:**

### Q3.2 — Role identity

- [x] **`name` + unique snake_case `code` (entity-codes pattern, spec 008)** — `code` gives migrations, seeds, and tests a stable handle (`admin`, `order_manager`) that survives renames; `name` stays free-form for display.
- [ ] **Name only** — the seeded Admin role must then be found by name, which a rename breaks.
- [ ] **Code only** — hostile to phase 2 display; every UI string would be a slug.

**Answer:**

### Q3.3 — How grants are edited

- [x] **`permissions: string[]` on the role body, full replace on create/update** — `{ name, code, parentId, permissions: ["orders:read", "orders:write"] }`; Zod validates each entry against the catalog (`resource:action` or `*`); simple diffing in the service (delete + insert grants).
- [ ] **Separate `POST/DELETE /roles/:id/permissions` grant endpoints** — RESTful but chatty; phase 2's matrix UI naturally submits the whole set anyway.
- [ ] **Permissions as a JSON column on the role row** — no join table, but loses queryability ("which roles grant orders:write?") and referential cleanliness.

**Answer:**

### Q3.4 — User-role assignment endpoint

- [x] **`PUT /users/:id/roles` with `{ roleIds: string[] }`, full replace** — one idempotent endpoint expressing "this user's roles are now exactly X"; rides on `users:write`; response returns the user with roles.
- [ ] **`roleIds` folded into `PATCH /users/:id`** — mixes identity editing with access control in one payload; a profile update tool could accidentally strip roles by omission.
- [ ] **`POST`/`DELETE /users/:id/roles/:roleId` per role** — chatty, and "replace set" (the common UI operation) needs client-side diffing.

**Answer:**

### Q3.5 — Protecting the Admin role and preventing lockout

- [x] **`isSystem` flag on the seeded Admin role: cannot be deleted, grants immutable (always `*`); plus the API refuses to remove the last Admin-holding user's assignment** — you can rename it and assign/unassign freely otherwise, but the system always retains at least one wildcard user; both violations → 409.
- [ ] **No protection** — one careless `PUT /users/:id/roles` and nobody can manage roles anymore; recovery requires SQL surgery.
- [ ] **Protect by hardcoded code `admin` without a flag** — works but buries the rule in string comparisons; the flag documents intent and lets future system roles reuse it.

**Answer:**

### Q3.6 — Deletion and hierarchy validation rules

- [x] **Delete blocked with 409 while users hold the role or child roles point to it; cycle-creating `parentId` updates → 409; missing parent → 404** — deletion is explicit (unassign users / re-parent children first), so access never silently disappears; the in-memory ancestor walk makes the cycle check three lines.
- [ ] **Cascade: deleting a role unassigns users and re-parents children to the deleted role's parent** — convenient but silently changes many users' effective access in one call.
- [ ] **Soft-delete roles** — Marketlum has no soft-delete pattern; dead roles would clutter the tree forever.

**Answer:**

---

## Round 4 — Migration, tests, delivery

Round 3 accepted as recommended. Final round: how existing users, seeds, and the 858-test suite survive the switch to deny-by-default, plus delivery order.

### Q4.1 — Migration and grandfathering

- [x] **One migration: create `roles`/`role_permissions`/`users_roles`, insert the Admin role (`code: admin`, `isSystem`, grant `*`), and assign it to every existing user** — after `pnpm migration:run`, nothing behaves differently for anyone; tightening access is then a deliberate act. `seed:admin` also assigns the Admin role so fresh databases work.
- [ ] **Migration creates tables only; a separate seed command grandfathers users** — introduces a window where a migrated system denies everyone until an operator remembers the second step.
- [ ] **No grandfathering; assign roles manually post-migration** — guaranteed lockout on deploy.

**Answer:**

### Q4.2 — Expose effective permissions on `/auth/me`

- [x] **Yes — add `roles: [{id, name, code}]` and `permissions: string[]` (effective, resolved) to the `/auth/me` response now** — phase 2's frontend gating needs exactly this, it's one service call the guard already performs, and API clients can introspect their own access.
- [ ] **Defer to phase 2** — saves a few lines now, forces a coordinated API+UI change later.

**Answer:**

### Q4.3 — Keeping the existing 858 tests green

Every existing scenario authenticates via `createAuthenticatedUser()` (`apps/api/test/setup.ts`); under deny-by-default those users would 403 everywhere.

- [x] **`createAuthenticatedUser()` assigns the Admin role by default; a new `createUserWithRoles()` helper serves the HRBAC scenarios** — one edit in setup.ts keeps all 858 scenarios meaning what they meant ("an authenticated admin can…"); permission-denial paths are tested explicitly with the new helper.
- [ ] **Auto-grant Admin inside the test app module** — invisible magic; the HRBAC scenarios would then need to *undo* it to test denial.
- [ ] **Touch every existing step file to assign roles** — hundreds of edits for zero expressiveness.

**Answer:**

### Q4.4 — Default roles for newly created users

- [x] **None — a new user (via `POST /users`) has no roles and can do nothing until assigned** — consistent with deny-by-default; assignment is one `PUT /users/:id/roles` away, and phase 2 folds it into the user form.
- [ ] **Auto-assign a configurable default role (system setting)** — convenience that reintroduces implicit access; defensible later if onboarding friction shows up.
- [ ] **Auto-assign Admin (status quo behavior)** — makes the whole feature opt-in-per-user and easy to forget.

**Answer:**

### Q4.5 — BDD coverage

Proposed files in `packages/bdd/features/roles/` (step defs in `apps/api/test/roles/`):

```
management.feature  (~10): create role with permissions; invalid permission string → 400;
                           list roles; update grants (replace semantics); reparent; cycle → 409;
                           delete with users assigned → 409; delete with child roles → 409;
                           system role: delete → 409, grant change → 409; missing parent → 404
enforcement.feature (~11): role with orders:read → GET /orders 200, POST /orders 403;
                           no roles → 403 on /orders, but /auth/me still 200;
                           wildcard role → everything 200; hierarchy: parent role includes
                           child-role grants (Q1.2 direction); union across two roles;
                           API key of a read-only user → same 403 on write;
                           /api-keys self-service works for a role-less user;
                           roles endpoints themselves gated (roles:read needed);
                           plugin route gated by rdhy.* resource;
                           removing last Admin user → 409
```

Plus a plain jest unit test (not BDD) asserting every `@Controller` prefix in core + plugins resolves to a catalogued resource (the Q2.1 drift guard).

- [x] **As proposed (~21 scenarios + drift unit test)** — every Round 1–3 decision has a scenario proving it.
- [ ] **Slimmer (~12, skip plugin/API-key/hierarchy edge scenarios)** — exactly the scenarios that catch integration regressions are the ones skipped.
- [ ] **Also test every core resource's gating exhaustively (~40+)** — the guard is convention-driven; one resource proves the convention, the drift test proves coverage.

**Answer:**

### Q4.6 — Delivery order (single PR)

- [x] **Shared (catalog + schemas + event types) → feature files → entities + migration + registrations → PermissionsService + guard fold + decorators → roles controller + `PUT /users/:id/roles` → setup.ts helper change → new BDD suites green → full `pnpm test:e2e` before merge** — the guard change touches literally every endpoint, so the full-suite run (locally, outside the conversation per project convention) is the merge gate, not optional.
- [ ] **Two PRs: model+endpoints first (guard inert), then flip enforcement** — a "dark launch" of RBAC; safer in a multi-dev team, ceremony for a solo repo where the full suite is the safety net.

**Answer:**
