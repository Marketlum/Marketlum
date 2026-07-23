import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Accepts either a cookie-JWT session or an API key (tried in that order).
@Injectable()
export class AdminGuard extends AuthGuard(['jwt', 'api-key']) {}
