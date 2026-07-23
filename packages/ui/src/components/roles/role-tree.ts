import type { RoleResponse } from '@marketlum/shared';

export interface RoleTreeRow {
  role: RoleResponse;
  depth: number;
}

/** Flattens roles into display order: roots first, children indented under parents. */
export function toTreeRows(roles: RoleResponse[]): RoleTreeRow[] {
  const childrenByParent = new Map<string | null, RoleResponse[]>();
  for (const role of roles) {
    const key = role.parentId ?? null;
    const siblings = childrenByParent.get(key) ?? [];
    siblings.push(role);
    childrenByParent.set(key, siblings);
  }
  for (const siblings of childrenByParent.values()) {
    siblings.sort((a, b) => a.name.localeCompare(b.name));
  }

  const rows: RoleTreeRow[] = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const role of childrenByParent.get(parentId) ?? []) {
      rows.push({ role, depth });
      visit(role.id, depth + 1);
    }
  };
  visit(null, 0);

  // Orphans (parent not in the list) should never happen, but render them
  // rather than lose them.
  const seen = new Set(rows.map((r) => r.role.id));
  for (const role of roles) {
    if (!seen.has(role.id)) rows.push({ role, depth: 0 });
  }
  return rows;
}

/** Ids of the role's transitive descendants (the roles it inherits from). */
export function descendantIds(roleId: string, roles: RoleResponse[]): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const role of roles) {
    if (!role.parentId) continue;
    const siblings = childrenByParent.get(role.parentId) ?? [];
    siblings.push(role.id);
    childrenByParent.set(role.parentId, siblings);
  }
  const result = new Set<string>();
  const queue = [...(childrenByParent.get(roleId) ?? [])];
  while (queue.length > 0) {
    const id = queue.pop()!;
    if (result.has(id)) continue;
    result.add(id);
    queue.push(...(childrenByParent.get(id) ?? []));
  }
  return result;
}

/** Permissions a role inherits from its descendants (spec 020: parent ⊃ children). */
export function inheritedPermissions(roleId: string, roles: RoleResponse[]): Set<string> {
  const ids = descendantIds(roleId, roles);
  const inherited = new Set<string>();
  for (const role of roles) {
    if (!ids.has(role.id)) continue;
    for (const permission of role.permissions) inherited.add(permission);
  }
  return inherited;
}
