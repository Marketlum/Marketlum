import { SetMetadata } from '@nestjs/common';

export const ALLOW_AUTHENTICATED_KEY = 'marketlum:allowAuthenticated';

/**
 * Skips the permission check for a handler or controller — authentication is
 * still required. For self-service endpoints (/auth/me, /api-keys, …) that any
 * authenticated user may call regardless of roles.
 */
export const AllowAuthenticated = () => SetMetadata(ALLOW_AUTHENTICATED_KEY, true);
