import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PermissionsService } from '../roles/permissions.service';
import { User } from '../users/entities/user.entity';
import { REQUIRE_PERMISSION_KEY } from './decorators/require-permission.decorator';
import { ALLOW_AUTHENTICATED_KEY } from './decorators/allow-authenticated.decorator';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Route prefixes that map onto another resource's permission.
const RESOURCE_ALIASES: Record<string, string> = {
  folders: 'files',
};

/**
 * Infers the permission resource from a request path (spec 020 Q2.2):
 * first path segment, aliases applied; plugin feature routes
 * `/plugins/<id>/<sub>` become `<id>.<sub>`. Exported for the catalog
 * drift test.
 */
export function inferResource(path: string): string {
  const segments = path.split('?')[0].split('/').filter(Boolean);
  const first = segments[0] ?? '';
  if (first === 'plugins' && segments.length >= 2) {
    // `/plugins` and `/plugins/:id/settings` belong to plugin MANAGEMENT and
    // are claimed by @RequirePermission('plugins') on PluginsController; any
    // other `/plugins/<id>/…` route is a plugin feature route.
    return segments.length >= 3 ? `${segments[1]}.${segments[2]}` : segments[1];
  }
  return RESOURCE_ALIASES[first] ?? first;
}

export function inferAction(method: string): 'read' | 'write' {
  return READ_METHODS.has(method.toUpperCase()) ? 'read' : 'write';
}

@Injectable()
export class PermissionCheckService {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async check(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(ALLOW_AUTHENTICATED_KEY, targets)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: User }>();
    const user = request.user;
    if (!user) return false;

    const action = inferAction(request.method);
    const override = this.reflector.getAllAndOverride<string>(REQUIRE_PERMISSION_KEY, targets);
    const permission = override
      ? override.includes(':')
        ? override
        : `${override}:${action}`
      : `${inferResource(request.path)}:${action}`;

    const permissions = await this.permissionsService.getEffectivePermissions(user.id);
    if (!this.permissionsService.hasPermission(permissions, permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`);
    }
    return true;
  }
}
