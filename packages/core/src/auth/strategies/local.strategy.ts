import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuditCategory, UserType } from '@marketlum/shared';
import { AuthService } from '../auth.service';
import { UsersService } from '../../users/users.service';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string) {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      // One lookup solely to classify the failure; never anything
      // password-shaped in the entry (spec 026 Q12).
      const attempted = await this.usersService.findByEmail(email);
      const reason =
        attempted?.type === UserType.AGENT ? 'agent_login_rejected' : 'invalid_credentials';
      await this.auditService.record(AuditCategory.AUTH, {
        action: 'login_failure',
        anonymous: true,
        context: { attemptedEmail: email, reason },
      });
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
}
