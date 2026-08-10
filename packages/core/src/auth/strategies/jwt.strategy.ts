import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Request } from 'express';
import { UserType } from '@marketlum/shared';
import { UsersService } from '../../users/users.service';
import { AuditContext } from '../../audit/audit-context';

function extractJwtFromCookie(req: Request): string | null {
  if (req?.cookies?.token) {
    return req.cookies.token;
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractJwtFromCookie]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    });
  }

  async validate(payload: { sub: string; email: string }) {
    let user;
    try {
      user = await this.usersService.findOne(payload.sub);
    } catch {
      throw new UnauthorizedException();
    }
    // Spec 025: agent users can never hold sessions — even a validly signed
    // cookie for an agent is rejected.
    if (user.type === UserType.AGENT) {
      throw new UnauthorizedException();
    }
    AuditContext.merge({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      userType: user.type,
    });
    return user;
  }
}
