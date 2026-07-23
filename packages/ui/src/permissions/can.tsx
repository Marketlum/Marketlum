'use client';

import type { ReactNode } from 'react';
import type { PermissionAction } from '@marketlum/shared';
import { usePermissions } from './permissions-context';

/** Renders children only when the signed-in user holds `resource:action` (or the wildcard). */
export function Can({
  resource,
  action,
  children,
}: {
  resource: string;
  action: PermissionAction;
  children: ReactNode;
}) {
  const { can } = usePermissions();
  if (!can(resource, action)) return null;
  return <>{children}</>;
}
