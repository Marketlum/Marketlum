'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { canPermission, type AuthMeResponse, type PermissionAction, type RoleSummary } from '@marketlum/shared';

export interface PermissionsContextValue {
  /** The signed-in user's id (null before the /auth/me fetch resolves). */
  userId: string | null;
  roles: RoleSummary[];
  permissions: Set<string>;
  can: (resource: string, action: PermissionAction) => boolean;
  /** Refetches /auth/me — call after changing the signed-in user's own roles. */
  refresh: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({
  user,
  refresh,
  children,
}: {
  user: AuthMeResponse | null;
  refresh: () => Promise<void>;
  children: ReactNode;
}) {
  const value = useMemo<PermissionsContextValue>(() => {
    const permissions = new Set(user?.permissions ?? []);
    return {
      userId: user?.id ?? null,
      roles: user?.roles ?? [],
      permissions,
      can: (resource, action) => canPermission(permissions, resource, action),
      refresh,
    };
  }, [user, refresh]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions(): PermissionsContextValue {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}
