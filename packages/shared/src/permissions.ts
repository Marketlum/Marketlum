import { z } from 'zod';

export const PERMISSION_ACTIONS = ['read', 'write'] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

// Core permission resources, matching API route prefixes. Plugin resources
// (e.g. "rdhy.vam-agreements") are contributed at runtime via each plugin's
// `permissionResources` and are validated in RolesService, not here.
export const PERMISSION_RESOURCES = [
  'accounts',
  'agents',
  'agreement-templates',
  'agreements',
  'archetypes',
  'channels',
  'dashboard',
  'exchange-rates',
  'exchanges',
  'files',
  'geographies',
  'invoices',
  'locales',
  'offerings',
  'orders',
  'perspectives',
  'pipelines',
  'plugins',
  'roles',
  'search',
  'system-settings',
  'taxonomies',
  'tensions',
  'transactions',
  'users',
  'value-instances',
  'value-streams',
  'values',
] as const;
export type PermissionResource = (typeof PERMISSION_RESOURCES)[number];

export const WILDCARD_PERMISSION = '*';

export const PERMISSION_PATTERN = /^(\*|[a-z0-9-]+(\.[a-z0-9-]+)?:(read|write))$/;

export const permissionSchema = z
  .string()
  .regex(PERMISSION_PATTERN, 'Permission must be "*" or "<resource>:<read|write>"');

export function permissionFor(resource: string, action: PermissionAction): string {
  return `${resource}:${action}`;
}

export function permissionResourceOf(permission: string): string | null {
  if (permission === WILDCARD_PERMISSION) return null;
  return permission.split(':')[0];
}

export function canPermission(
  permissions: Iterable<string>,
  resource: string,
  action: PermissionAction,
): boolean {
  const set = permissions instanceof Set ? (permissions as Set<string>) : new Set(permissions);
  return set.has(WILDCARD_PERMISSION) || set.has(permissionFor(resource, action));
}
