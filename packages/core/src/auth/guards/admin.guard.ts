import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionCheckService } from '../permission-check.service';

// Accepts either a cookie-JWT session or an API key (tried in that order),
// then enforces role permissions (spec 020): the permission check lives inside
// the guard because NestJS runs global guards before controller guards, so a
// separate global PermissionsGuard would never see request.user.
@Injectable()
export class AdminGuard extends AuthGuard(['jwt', 'api-key']) {
  constructor(private readonly permissionCheck: PermissionCheckService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authenticated = await super.canActivate(context);
    if (!authenticated) return false;
    return this.permissionCheck.check(context);
  }
}
