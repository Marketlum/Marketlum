import { AuthGuard } from '@nestjs/passport';

// Cookie-JWT sessions only — unlike AdminGuard it does NOT accept API keys,
// so key management endpoints stay out of reach of the keys themselves.
export class SessionGuard extends AuthGuard('jwt') {}
