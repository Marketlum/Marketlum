import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionCheckService } from '../permission-check.service';

// Cookie-JWT sessions only — unlike AdminGuard it does NOT accept API keys,
// so key management endpoints stay out of reach of the keys themselves.
// Role permissions are enforced the same way as AdminGuard.
@Injectable()
export class SessionGuard extends AuthGuard('jwt') {
  constructor(private readonly permissionCheck: PermissionCheckService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authenticated = await super.canActivate(context);
    if (!authenticated) return false;
    return this.permissionCheck.check(context);
  }
}
