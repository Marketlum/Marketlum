import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import { ApiKeysService } from '../../api-keys/api-keys.service';
import { AuditContext } from '../../audit/audit-context';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private readonly apiKeysService: ApiKeysService) {
    super();
  }

  async validate(token: string) {
    const detailed = await this.apiKeysService.verifyDetailed(token);
    if (!detailed) {
      throw new UnauthorizedException();
    }
    const { user, apiKey } = detailed;
    AuditContext.merge({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      userType: user.type,
      apiKeyId: apiKey.id,
      apiKeyName: apiKey.name,
    });
    return user;
  }
}
