import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WILDCARD_PERMISSION } from '@marketlum/shared';
import { Role, RolePermission } from './entities/role.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
  ) {}

  // Effective permissions = grants of the user's roles plus all their
  // DESCENDANT roles (spec 020 Q1.2: a parent role is a superset of its
  // children). The roles table is tiny, so everything is walked in memory.
  async getEffectivePermissions(userId: string): Promise<Set<string>> {
    const assigned: { roleId: string }[] = await this.roleRepository.query(
      `SELECT "roleId" FROM "users_roles" WHERE "userId" = $1`,
      [userId],
    );
    if (assigned.length === 0) return new Set();

    const roleIds = this.expandWithDescendants(
      assigned.map((row) => row.roleId),
      await this.roleRepository.find(),
    );

    const grants = await this.rolePermissionRepository.find();
    return new Set(grants.filter((g) => roleIds.has(g.roleId)).map((g) => g.permission));
  }

  hasPermission(permissions: Set<string>, permission: string): boolean {
    return permissions.has(WILDCARD_PERMISSION) || permissions.has(permission);
  }

  // Which roles are wildcard-granting, counting descendants (a role whose
  // child holds '*' is itself effectively wildcard).
  async wildcardRoleIds(): Promise<Set<string>> {
    const roles = await this.roleRepository.find();
    const grants = await this.rolePermissionRepository.find();
    const wildcardHolders = new Set(
      grants.filter((g) => g.permission === WILDCARD_PERMISSION).map((g) => g.roleId),
    );
    const result = new Set<string>();
    for (const role of roles) {
      const expanded = this.expandWithDescendants([role.id], roles);
      for (const id of expanded) {
        if (wildcardHolders.has(id)) {
          result.add(role.id);
          break;
        }
      }
    }
    return result;
  }

  expandWithDescendants(roleIds: string[], allRoles: Role[]): Set<string> {
    const childrenByParent = new Map<string, string[]>();
    for (const role of allRoles) {
      if (!role.parentId) continue;
      const siblings = childrenByParent.get(role.parentId) ?? [];
      siblings.push(role.id);
      childrenByParent.set(role.parentId, siblings);
    }

    const expanded = new Set<string>();
    const queue = [...roleIds];
    while (queue.length > 0) {
      const id = queue.pop()!;
      if (expanded.has(id)) continue;
      expanded.add(id);
      queue.push(...(childrenByParent.get(id) ?? []));
    }
    return expanded;
  }
}
