import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateRoleInput,
  UpdateRoleInput,
  PERMISSION_RESOURCES,
  WILDCARD_PERMISSION,
  permissionResourceOf,
} from '@marketlum/shared';
import { Role, RolePermission } from './entities/role.entity';
import { PermissionsService } from './permissions.service';
import { PLUGINS } from '../plugins/plugin-tokens';
import { MarketlumApiPlugin } from '../plugins/marketlum-api-plugin';

export interface RoleView {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  isSystem: boolean;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    private readonly permissionsService: PermissionsService,
    @Inject(PLUGINS) private readonly plugins: MarketlumApiPlugin[],
  ) {}

  permissionResourceCatalog(): Set<string> {
    return new Set([
      ...PERMISSION_RESOURCES,
      ...this.plugins.flatMap((p) => p.permissionResources ?? []),
    ]);
  }

  async findAll(): Promise<RoleView[]> {
    const roles = await this.roleRepository.find({
      relations: ['grants'],
      order: { createdAt: 'ASC' },
    });
    return roles.map((role) => this.toView(role));
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id }, relations: ['grants'] });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async findByCode(code: string): Promise<Role | null> {
    return this.roleRepository.findOne({ where: { code }, relations: ['grants'] });
  }

  async create(input: CreateRoleInput): Promise<RoleView> {
    this.validatePermissionResources(input.permissions);

    if (input.parentId) {
      await this.findOne(input.parentId);
    }

    const existing = await this.roleRepository.findOne({ where: { code: input.code } });
    if (existing) {
      throw new ConflictException('Role with this code already exists');
    }

    const role = await this.roleRepository.save(
      this.roleRepository.create({
        name: input.name,
        code: input.code,
        parentId: input.parentId ?? null,
      }),
    );
    await this.replaceGrants(role.id, input.permissions);
    return this.toView(await this.findOne(role.id));
  }

  async update(id: string, input: UpdateRoleInput): Promise<RoleView> {
    const role = await this.findOne(id);

    if (input.permissions !== undefined) {
      if (role.isSystem && !this.sameGrants(role, input.permissions)) {
        throw new ConflictException('System role grants cannot be changed');
      }
      this.validatePermissionResources(input.permissions);
    }

    if (input.parentId !== undefined && input.parentId !== null) {
      const parent = await this.findOne(input.parentId);
      await this.assertNoCycle(role.id, parent.id);
    }

    if (input.name !== undefined) role.name = input.name;
    if (input.parentId !== undefined) role.parentId = input.parentId;
    await this.roleRepository.save(role);

    if (input.permissions !== undefined && !role.isSystem) {
      await this.replaceGrants(role.id, input.permissions);
    }
    return this.toView(await this.findOne(id));
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);

    if (role.isSystem) {
      throw new ConflictException('System roles cannot be deleted');
    }

    const children = await this.roleRepository.count({ where: { parentId: id } });
    if (children > 0) {
      throw new ConflictException('Role has child roles; re-parent them first');
    }

    const assignments: { count: string }[] = await this.roleRepository.query(
      `SELECT COUNT(*)::text AS count FROM "users_roles" WHERE "roleId" = $1`,
      [id],
    );
    if (parseInt(assignments[0].count, 10) > 0) {
      throw new ConflictException('Role is assigned to users; unassign them first');
    }

    await this.roleRepository.remove(role);
  }

  // Used by seed:admin and the test bootstrap; the only path that creates a
  // system role.
  async ensureAdminRole(): Promise<Role> {
    const existing = await this.findByCode('admin');
    if (existing) return existing;

    const role = await this.roleRepository.save(
      this.roleRepository.create({ name: 'Admin', code: 'admin', isSystem: true }),
    );
    await this.rolePermissionRepository.save(
      this.rolePermissionRepository.create({ roleId: role.id, permission: WILDCARD_PERMISSION }),
    );
    return this.findOne(role.id) as Promise<Role>;
  }

  private validatePermissionResources(permissions: string[]): void {
    const catalog = this.permissionResourceCatalog();
    for (const permission of permissions) {
      const resource = permissionResourceOf(permission);
      if (resource === null) continue; // wildcard
      if (!catalog.has(resource)) {
        throw new BadRequestException(`Unknown permission resource: ${resource}`);
      }
    }
  }

  private async replaceGrants(roleId: string, permissions: string[]): Promise<void> {
    await this.rolePermissionRepository.delete({ roleId });
    const unique = [...new Set(permissions)];
    if (unique.length > 0) {
      await this.rolePermissionRepository.save(
        unique.map((permission) => this.rolePermissionRepository.create({ roleId, permission })),
      );
    }
  }

  private sameGrants(role: Role, permissions: string[]): boolean {
    const current = new Set((role.grants ?? []).map((g) => g.permission));
    const next = new Set(permissions);
    return current.size === next.size && [...next].every((p) => current.has(p));
  }

  private async assertNoCycle(roleId: string, newParentId: string): Promise<void> {
    const roles = await this.roleRepository.find();
    const byId = new Map(roles.map((r) => [r.id, r]));
    let cursor: string | null = newParentId;
    while (cursor) {
      if (cursor === roleId) {
        throw new ConflictException('Role hierarchy cannot contain cycles');
      }
      cursor = byId.get(cursor)?.parentId ?? null;
    }
  }

  private toView(role: Role): RoleView {
    return {
      id: role.id,
      name: role.name,
      code: role.code,
      parentId: role.parentId,
      isSystem: role.isSystem,
      permissions: (role.grants ?? []).map((g) => g.permission).sort(),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
