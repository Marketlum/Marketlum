# 021 — HRBAC Phase 2 (UI & Frontend Gating): Brainstorming

> **Goal:** Give spec 020's backend a face: a roles management page (tree + permission matrix), role assignment on the users page, and a permission-aware frontend that filters the sidebar by `resource:read` and hides write actions without `resource:write`, driven by the roles/permissions that `/auth/me` now returns.

> **Process:** This document is append-only. Each round of questions is appended below the previous one. For every question, the recommended option is preselected with `[x]`; move the `[x]` to override, and/or write elaboration after `**Answer:**`. Existing content is never edited or deleted.

## Context

What exists after phase 1 (spec 020):

- **Backend complete**: `GET/POST/PATCH/DELETE /roles` (flat list with `parentId`, `isSystem`, `permissions[]`), `PUT /users/:id/roles`, lockout/cycle/system-role rules, deny-by-default enforcement with 403s. `/auth/me` returns `roles: {id,name,code}[]` and effective `permissions: string[]`.
- **Frontend is permission-blind**: `AdminLayout` (`packages/ui/src/layouts/admin-layout.tsx`) calls `getMe()` once on mount and renders every nav item; entity pages render every action button; a restricted user today sees a full UI where most clicks produce 403 toasts.
- **Catalog**: `PERMISSION_RESOURCES` is exported from `@marketlum/shared`, but **plugin resources** (`rdhy.platforms`, `nbp.refresh`, …) exist only in the backend's runtime plugin registry — the frontend cannot currently enumerate them.
- **Patterns**: users page = TanStack table + dialogs (`user-form-dialog`, `change-password-dialog`); plugin nav items merge via `mergePluginNav`; pages in `packages/ui/src/pages/admin/`, thin re-exports in `apps/web` mirrored to the create-marketlum-app template; en/pl messages.

```
 /auth/me ──► { roles, permissions } ──► PermissionsProvider (AdminLayout)
                                              │
              ┌───────────────────────────────┼─────────────────────────┐
              ▼                               ▼                         ▼
      sidebar filtering                 page-level guard        action gating
      (resource:read per item)          (403 panel)             (hide without :write)
```

---

## Round 1 — Frontend permission architecture

How permission state reaches components, and the default gating behaviors.

### Q1.1 — Where does permission state live?

- [x] **React context (`PermissionsProvider`) fed by the existing `getMe()` call in `AdminLayout`** — one fetch (already happens), one provider wrapping the admin shell; `UserResponse` type extended with `roles`/`permissions`.
- [ ] **Each component fetches `/auth/me` as needed** — N requests and loading states for globally constant data.
- [ ] **A store library (zustand/jotai)** — new dependency for one context's worth of state.

**Answer:**

### Q1.2 — Consumption API

- [x] **`usePermissions()` hook exposing `can(resource, action)` + a `<Can resource action>` wrapper component** — `can()` handles the wildcard; the `<Can>` component makes JSX gating read declaratively (`<Can resource="orders" action="write"><Button…/></Can>`).
- [ ] **Hook only** — every gate is an inline ternary; noisier JSX.
- [ ] **HOC (`withPermissions`)** — legacy React pattern; hooks are the codebase norm.

**Answer:**

### Q1.3 — Sidebar behavior for missing `resource:read`

- [x] **Hide the nav item entirely; hide a group when all its items are hidden** — a restricted user sees only their world; each core nav item gains a `resource` field, and the plugin nav item interface gains the same (gated the same way in `mergePluginNav`).
- [ ] **Show disabled/greyed items** — advertises features the user can't open; visual noise with no action to take.
- [ ] **Leave the sidebar full, rely on page-level 403s** — the "everything errors" experience phase 2 exists to fix.

**Answer:**

### Q1.4 — Write-action gating (create/edit/delete buttons, form submits)

- [x] **Hide write actions without `resource:write`** — the page becomes read-only naturally: no "Create" button, no row-action edit/delete items; consistent with hiding nav items. The API remains the enforcement point, so a missed gate degrades to a 403 toast, never a security hole.
- [ ] **Disable with a tooltip ("requires orders:write")** — more discoverable but litters read-only views with dead controls.
- [ ] **Gate at click time (show toast on click)** — interactive disappointment as a design pattern.

**Answer:**

### Q1.5 — Direct navigation to a forbidden page

A user without `orders:read` opens `/admin/orders` via URL.

- [x] **Layout-level guard renders an "Access denied" panel** — `AdminLayout` already knows the route and (via the same nav `resource` map) the needed permission; render a friendly panel with the missing permission named instead of the page. No redirect loops, no per-page changes.
- [ ] **Each page checks and renders its own denied state** — ~30 pages to touch, identical code each time.
- [ ] **Redirect to dashboard** — dashboard itself needs `dashboard:read`; a fully restricted user would bounce in a loop; also hides *why* access failed.

**Answer:**

### Q1.6 — Permission staleness

Permissions load with `getMe()` at layout mount; a role change elsewhere isn't reflected until reload.

- [x] **Accept mount-time snapshot** — the API enforces truth on every request regardless; a stale UI over-shows at worst (403 toast) or under-shows until refresh. Zero infrastructure.
- [ ] **Refetch `/auth/me` on window focus** — freshness nobody asked for at the cost of request chatter.
- [ ] **Poll on an interval** — worst of both.

**Answer:**

---

## Round 2 — Roles page & permission matrix

Round 1 accepted as recommended. This round shapes `/admin/roles`: how the tree is shown, how grants are edited, and where the matrix's resource list comes from.

### Q2.1 — The plugin-resource catalog gap

The matrix editor must list every grantable resource, but plugin resources live only in the backend's runtime registry.

- [x] **Small backend addition: `GET /roles/permission-catalog` → `{ resources: string[] }`** — returns `PERMISSION_RESOURCES` ∪ plugin `permissionResources` (the same set `RolesService` validates against, so the matrix can never offer an ungrantable resource); rides on `roles:read`; one BDD scenario proves plugin resources appear.
- [ ] **Frontend imports `PERMISSION_RESOURCES` from shared only** — plugin resources become invisible in the matrix; RDHY grants could then only be entered by hand-editing.
- [ ] **Derive the list from grants already present across roles** — can't grant a resource nobody has granted yet; circular.

**Answer:**

### Q2.2 — Roles page layout

- [x] **Table with indented tree rendering + dialogs (Marketlum house style)** — one table sorted by hierarchy, name cell indented per depth with a tree glyph; Create/Edit open a dialog (form + matrix); roles number in the dozens, so no pagination/search. `isSystem` rows get a lock icon and no edit-grants affordance.
- [ ] **Split-pane (tree left, detail right)** — a new layout pattern for the smallest entity in the system.
- [ ] **Dedicated detail page per role** — page-per-role navigation for what a dialog holds comfortably.

**Answer:**

### Q2.3 — Permission matrix control (inside the role dialog)

```
Role: Order Manager          Parent: [ Operations ▼ ]
┌────────────────────┬───────┬────────┐
│ Resource           │ read  │ write  │
├────────────────────┼───────┼────────┤
│ orders             │ [x]   │ [x]    │
│ invoices           │ [x]   │ [ ]    │
│ agents             │ [~]   │ [ ]    │  ~ = inherited from child role "Viewer"
│ rdhy.platforms     │ [ ]   │ [ ]    │
│ …                  │       │        │
└────────────────────┴───────┴────────┘
[ ] Grant everything (*)  — replaces the matrix when checked
```

- [x] **Resources × read/write checkbox matrix, with a "Grant everything (`*`)" toggle that collapses the matrix, and inherited grants shown checked-but-disabled with an "inherited" marker** — direct grants are editable; inherited ones (computed client-side by walking descendants in the flat roles list) are visible but not editable here, teaching the inheritance direction visually.
- [ ] **Free-form tag input of permission strings** — power-user friendly, typo-hostile, hides the catalog.
- [ ] **Matrix without inherited display** — simplest, but a parent role's dialog then lies about what it can actually do.

**Answer:**

### Q2.4 — Hierarchy editing

- [x] **Parent dropdown in the role dialog (excluding self and descendants), plus a read-only indented tree in the table** — cycle-invalid choices never appear; the 409 stays as a backend backstop.
- [ ] **Drag-and-drop reparenting in the table** — delightful and disproportionate for dozens of rows; new DnD dependency.
- [ ] **No hierarchy editing in UI (API only)** — leaves the "H" of HRBAC console-only.

**Answer:**

### Q2.5 — Role deletion UX

- [x] **Delete row action with confirm dialog; backend 409s surface as specific toasts** — "Role is assigned to users" / "Role has child roles" / "System roles cannot be deleted" map to distinct messages (the API error message passes through); no client-side pre-checks that duplicate backend rules.
- [ ] **Pre-check client-side and disable delete when referenced** — duplicates backend logic that can drift; hides the *why*.
- [ ] **Cascade prompt ("unassign 3 users and delete?")** — phase 1 deliberately made deletion explicit (spec 020 Q3.6); the UI shouldn't re-add the cascade.

**Answer:**

### Q2.6 — Where the roles page lives

- [x] **`/admin/roles`, System sidebar group, `ShieldCheck` icon, directly after Users** — roles govern users; adjacency makes the pairing discoverable; gated by `roles:read` like everything else.
- [ ] **Tab inside the Users page** — buries a first-class entity and complicates the users table with mode switching.
- [ ] **Under a new "Access control" group** — a group of one.

**Answer:**

---

## Round 3 — User assignment, edge-case UX, delivery

Round 2 accepted as recommended. Final round: how roles reach users in the UI, the awkward moments (lockout, self-demotion), and how the work ships.

### Q3.1 — Role assignment UI on the users page

- [x] **"Manage roles" row action opening a dedicated dialog (checkbox list of roles, save → `PUT /users/:id/roles`)** — mirrors the endpoint's replace-set semantics exactly; keeps identity editing (`user-form-dialog`) separate from access control, matching the backend's deliberate split (spec 020 Q3.4).
- [ ] **Role checkboxes inside the existing user form dialog** — one dialog fewer, but couples a `PATCH /users/:id` form to a second endpoint with different failure modes (409 lockout) and mixes concerns the backend kept apart.
- [ ] **Inline multi-select in the table row** — save-on-change access control edits; too easy to fat-finger.

**Answer:**

### Q3.2 — Roles visibility in the users table

- [x] **A "Roles" column with role-name badges (hidden on mobile)** — at-a-glance answer to "who can do what"; `GET /users` already returns role summaries (spec 020 Q4.2); empty state shows a muted "No roles" hint that doubles as the cue that a new user can't log in usefully yet.
- [ ] **No column; roles visible only in the dialog** — hides the single most operationally interesting fact on that page.
- [ ] **Effective permission count ("14 permissions")** — a number nobody can act on; the roles are the meaningful unit.

**Answer:**

### Q3.3 — Lockout and self-demotion UX

The backend 409s when a change would strip the last wildcard holder; changing your *own* roles also silently changes what the UI should show.

- [x] **Surface the 409 as a specific toast; on successful self-change, refetch `getMe()` so the provider/sidebar update immediately** — the lockout rule stays backend-owned; the only special-cased client behavior is refreshing the permission snapshot when the edited user is yourself (otherwise the stale-snapshot rule from Q1.6 applies).
- [ ] **Client-side warning before removing your own admin role** — a second implementation of the lockout rule that will drift from the backend's.
- [ ] **Forbid editing your own roles in the UI** — overreach; the backend already prevents the only dangerous case.

**Answer:**

### Q3.4 — Gating rollout across existing pages

Phase 2 must touch every entity page's write actions. How thorough is this PR?

- [x] **Full sweep: all core entity pages + plugin pages get `<Can>` gating on create/edit/delete actions, sidebar `resource` fields, and the layout guard** — partial gating is worse than none (users learn to distrust the UI); the sweep is mechanical (~30 pages × wrap 1–3 actions) and `<Can>` keeps each edit one line.
- [ ] **Gate only sidebar + layout in this PR; page actions in a follow-up** — a read-only user sees pages with buttons that all 403; the exact experience phase 2 exists to remove.
- [ ] **Gate only the "big" pages (orders, invoices, agents)** — arbitrary line; the tail pages are the cheap ones anyway.

**Answer:**

### Q3.5 — Test coverage

Per project convention there is no browser e2e; UI verification is `tsc` + builds.

- [x] **BDD only for the new API surface (`GET /roles/permission-catalog`: returns core + plugin resources, requires `roles:read` → 2 scenarios in `roles/catalog.feature`); UI verified by `tsc` + `@marketlum/ui` build + web `tsc`** — matches how every UI-heavy spec (007, 011) shipped; the enforcement behaviors the UI relies on are already covered by spec 020's 25 scenarios.
- [ ] **Introduce component testing (React Testing Library) for `<Can>`/provider** — new test infrastructure for logic that is three lines over a Set lookup.
- [ ] **No new tests at all** — the catalog endpoint is real API surface; untested endpoints violate the project's BDD rule.

**Answer:**

### Q3.6 — Delivery order (single PR)

- [x] **Catalog feature file + endpoint → shared types (`UserResponse` + roles/permissions, catalog response) → `PermissionsProvider`/`usePermissions`/`<Can>` → sidebar `resource` fields + plugin nav + layout guard → roles page (table, dialog, matrix) → users page (roles column, manage-roles dialog) → full gating sweep → en/pl messages → web routes + template mirror → `tsc`/builds green** — provider first so every later piece consumes it; the sweep last so it's one mechanical pass.
- [ ] **Two PRs (roles+users pages first, gating sweep second)** — ships a window where role management exists but the UI still lies to restricted users.

**Answer:**
