import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class CsrfProtectionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return true;
    }

    if (!request.headers['x-csrf-protection']) {
      throw new ForbiddenException('CSRF validation failed: missing X-CSRF-Protection header');
    }

    return true;
  }
}
