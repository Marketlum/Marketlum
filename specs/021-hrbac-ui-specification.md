# 021 — HRBAC Phase 2 (UI & Frontend Gating): Specification

> Decision trail: [`021-hrbac-ui-brainstorming.md`](./021-hrbac-ui-brainstorming.md). All rounds accepted as recommended. Builds on spec 020 (backend enforcement, complete).

## Overview

Phase 2 makes the frontend permission-aware and gives roles a management UI. A `PermissionsProvider` fed by the existing `getMe()` call exposes `can(resource, action)`; the sidebar hides items the user cannot read, a layout-level guard replaces forbidden pages with an "Access denied" panel, and every write action across core and plugin pages is wrapped in `<Can>`. A new `/admin/roles` page manages the role tree and grants via a permission matrix; the users page gains a Roles column and a "Manage roles" dialog. One small backend addition: `GET /roles/permission-catalog`, so the matrix can list plugin resources.

```
 getMe() ──► PermissionsProvider ──► usePermissions() / <Can>
                    │
   ┌────────────────┼──────────────────┬──────────────────────┐
   ▼                ▼                  ▼                      ▼
 sidebar         layout guard       write-action gating    roles + users pages
 (hide w/o       (Access denied     (<Can resource         (/admin/roles matrix,
  resource:read)  panel)             action="write">)       Manage-roles dialog)
```

## Backend addition (the only one)

### `GET /roles/permission-catalog` (`RolesController`)

- Response: `{ resources: string[] }` — `PERMISSION_RESOURCES ∪` plugin `permissionResources`, sorted; exactly `RolesService.permissionResourceCatalog()`, so the matrix can never offer an ungrantable resource.
- Gated by convention (`roles:read`). Route note: register **before** `@Get(':id')`-style routes if any are ever added; today the controller has no `GET /:id`, so ordering is safe.
- Zod: `permissionCatalogResponseSchema = z.object({ resources: z.array(z.string()) })` in `@marketlum/shared` (`role.schema.ts`), + `PermissionCatalogResponse` type.

### BDD (`packages/bdd/features/roles/catalog.feature`, steps in `apps/api/test/roles/catalog.steps.ts`)

1. Listing the permission catalog returns core and plugin resources — authenticated admin; response 200; `resources` contains `orders`, `roles`, and `rdhy.platforms` (plugin-contributed).
2. The permission catalog requires the roles permission — user with a role granting only `orders:read` → 403.

## Shared package additions

- `userResponseSchema` / `UserResponse` extended with `roles: roleSummarySchema[]` and (for `/auth/me`) `permissions: z.array(z.string())` — model as `authMeResponseSchema = userResponseSchema.extend({ permissions: … })` if keeping `UserResponse` lean; the UI's `getMe()` return type becomes `AuthMeResponse`.
- `permissionCatalogResponseSchema` + type (above).
- A pure helper in `permissions.ts`: `canPermission(permissions: string[] | Set<string>, resource: string, action: PermissionAction): boolean` — wildcard-aware; single implementation shared by the provider and any future consumer.

## UI package: permission infrastructure (`packages/ui/src/`)

### `permissions/permissions-context.tsx`

- `PermissionsProvider({ user, children })` — value: `{ permissions: Set<string>, roles: RoleSummary[], can(resource, action), refresh(): Promise<void> }`. `refresh()` refetches `getMe()` and updates state (used after self role-edit, Q3.3).
- `AdminLayout` wraps its content in the provider using the `getMe()` result it already fetches; `lib/auth.ts` `getMe()` return type updated.
- `usePermissions()` hook; throws if used outside the provider.

### `permissions/can.tsx`

```tsx
export function Can({ resource, action, children }: { resource: string; action: 'read' | 'write'; children: React.ReactNode }) {
  const { can } = usePermissions();
  return can(resource, action) ? <>{children}</> : null;
}
```

### Sidebar + layout guard (`layouts/admin-layout.tsx`)

- Every core nav item gains `resource: string` (equal to its route resource: `orders`, `users`, `roles`, …). Items render only when `can(resource, 'read')`; a group with zero visible items disappears. The global search input hides when `search:read` is missing; the ValueStreamSwitcher when `value-streams:read` is missing.
- **Plugin nav**: the plugin nav item type (`plugins/plugin-nav.ts`) gains `resource?: string`; `mergePluginNav` filters by `can(resource, 'read')` (items without `resource` stay visible — backward compatible). RDHY's nav items declare their `rdhy.*` resources.
- **Layout guard**: build `routeResource(pathname)` from the same nav item list (longest-prefix match on `href`). If the route maps to a resource and `!can(resource, 'read')`, render `<AccessDeniedPanel resource={resource} />` instead of `children`: lock icon, "You don't have access to this page", the missing permission in monospace (`orders:read`), and a "Go back" button. Unmapped routes (e.g. `/admin` home) render normally.

### Roles page (`pages/admin/roles-page.tsx` + `components/roles/`)

- Sidebar: System group, directly after Users, `ShieldCheck` icon, gated by `roles:read`.
- **`roles-data-table.tsx`** — fetches `GET /roles` + `GET /roles/permission-catalog`; orders rows as a tree (roots first, children indented under parents; depth via `parentId` walk). Columns: Name (indented, `└` glyph per depth, lock icon when `isSystem`) · Code (monospace) · Permissions (count badge, `*` shown as "Everything") · Users? — no (not in list response; skip) · row actions: Edit, Delete (Delete hidden for `isSystem`; whole action column wrapped in `<Can resource="roles" action="write">`).
- **`role-form-dialog.tsx`** — create/edit. Fields: Name, Code (create only, immutable after — same pattern as other coded entities), Parent (select of roles excluding self and its descendants, "None" option), and the **permission matrix**:
  - "Grant everything (`*`)" checkbox; when checked the matrix collapses to a summary line.
  - Otherwise a scrollable table: one row per catalog resource, read/write native checkboxes (shadcn Checkbox not installed — known gotcha).
  - **Inherited grants**: computed client-side — collect this role's descendants from the flat roles list, union their permissions; render inherited cells checked + disabled with a subtle "inherited" tooltip/marker. Direct grants remain editable independently.
  - `isSystem` role: name editable, matrix read-only (shows `*`), parent hidden.
  - Submit → `POST /roles` / `PATCH /roles/:id` (permissions full-replace). 409/400 messages pass through to toasts.
- **Delete** — `ConfirmDeleteDialog`; backend 409 messages ("assigned to users", "has child roles", "system role") surface verbatim in the error toast. No client-side pre-checks.

### Users page changes (`components/users/`)

- **`columns.tsx`**: new Roles column — badges with role names, muted "No roles" when empty, `meta: { hideOnMobile: true }`.
- **`manage-roles-dialog.tsx`** (new): checkbox list of all roles (fetched from `GET /roles`), preselected from the user's current roles; Save → `PUT /users/:id/roles` with the full set. 409 (lockout) → error toast with the backend message. If the edited user is the signed-in user, call `permissions.refresh()` after success so the sidebar/gates update immediately.
- **`users-data-table.tsx`**: "Manage roles" row action (wrapped in `<Can resource="users" action="write">`) opens the dialog.

### Gating sweep (mechanical, all pages)

For every core entity page/data-table and plugin page: wrap create buttons, row-action edit/delete/duplicate items, and other mutating affordances in `<Can resource="<resource>" action="write">`. Resources match the route resource of each page (`orders`, `invoices`, … ; RDHY pages use `rdhy.*`). Read-only affordances (view links, export) are not gated beyond the page itself. The sweep is one pass at the end; grep for `Plus`, `Trash2`, `DropdownMenuItem` usages per component to find the affordances.

### i18n

`messages/en.json` + `pl.json`: `nav.roles`; new `roles` namespace (title, description, createRole, editRole, deleteRole, name/code/parent/permissions labels, grantEverything, inherited, read/write column headers, system-role hints, error strings); `users` namespace additions (rolesColumn, noRoles, manageRoles, rolesUpdated, failed strings); `common.accessDenied` strings (title, description with `{permission}`).

## Web app wiring + template sync

- `apps/web/src/app/admin/roles/page.tsx`: `export { RolesPage as default } from '@marketlum/ui';`
- **Template sync (CLAUDE.md rule)**: mirror at `packages/create-marketlum-app/template/web/src/app/admin/roles/page.tsx`. No other template changes.

## Out of scope

- Browser e2e for the gating behaviors (project convention: `tsc` + builds — brainstorm Q3.5).
- Permission caching/refetch-on-focus (Q1.6), disabled-with-tooltip affordances (Q1.4), drag-and-drop reparenting (Q2.4), client-side lockout pre-checks (Q3.3), role detail pages (Q2.2).
- Phase 3 candidates: audit view ("who did what"), configurable default role for new users (spec 020 Q4.4 deferral).

## Delivery plan (single PR, Q3.6)

1. `catalog.feature` + steps; `GET /roles/permission-catalog` endpoint; shared schema additions (`AuthMeResponse`, catalog response, `canPermission`); rebuild shared; new BDD scenarios green.
2. `PermissionsProvider` + `usePermissions` + `<Can>`; `getMe()` typing; `AdminLayout` integration.
3. Sidebar `resource` fields (core + plugin nav interface + RDHY items) and the layout `AccessDeniedPanel` guard.
4. Roles page: data table (tree rendering), role form dialog with matrix + inherited display, delete flow; sidebar entry.
5. Users page: Roles column, manage-roles dialog with self-refresh, row action.
6. Gating sweep across all core + plugin pages.
7. en/pl messages; UI package exports; web route + template mirror.
8. Verification: `@marketlum/shared`/`core`/`ui` builds, web `tsc` (Node version still blocks `next build`), and the affected BDD suites (`test/roles`) locally; full `pnpm test:e2e` before merge as usual.
