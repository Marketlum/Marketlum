import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'marketlum:requirePermission';

/**
 * Overrides the convention-inferred permission for a handler or controller.
 * Accepts either a full permission ("orders:read") or a bare resource
 * ("plugins"), in which case the action is still inferred from the HTTP method.
 */
export const RequirePermission = (permission: string) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permission);
