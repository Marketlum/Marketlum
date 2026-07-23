'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  WILDCARD_PERMISSION,
  permissionFor,
  type RoleResponse,
  type CreateRoleInput,
  type UpdateRoleInput,
  type PermissionAction,
} from '@marketlum/shared';
import { useCodeFromName } from '../../hooks/use-code-from-name';
import { descendantIds, inheritedPermissions } from './role-tree';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const NO_PARENT = 'none';
const ACTIONS: PermissionAction[] = ['read', 'write'];

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateRoleInput | UpdateRoleInput) => Promise<void>;
  /** All roles, for the parent select and inherited-grant display. */
  allRoles: RoleResponse[];
  /** Grantable resources from GET /roles/permission-catalog. */
  resources: string[];
  /** Present when editing; absent when creating. */
  role?: RoleResponse | null;
  isSubmitting?: boolean;
}

export function RoleFormDialog({
  open,
  onOpenChange,
  onSubmit,
  allRoles,
  resources,
  role,
  isSubmitting,
}: RoleFormDialogProps) {
  const t = useTranslations('roles');
  const tc = useTranslations('common');
  const isEdit = !!role;
  const isSystem = role?.isSystem ?? false;

  const [name, setName] = useState('');
  const { code, onNameChange, onCodeChange, reset: resetCode } = useCodeFromName();
  const [parentId, setParentId] = useState<string>(NO_PARENT);
  const [wildcard, setWildcard] = useState(false);
  const [direct, setDirect] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setName(role?.name ?? '');
    resetCode(role?.code ?? '');
    setParentId(role?.parentId ?? NO_PARENT);
    const permissions = role?.permissions ?? [];
    setWildcard(permissions.includes(WILDCARD_PERMISSION));
    setDirect(new Set(permissions.filter((p) => p !== WILDCARD_PERMISSION)));
  }, [open, role, resetCode]);

  // A role cannot be re-parented under itself or one of its descendants.
  const parentOptions = useMemo(() => {
    if (!role) return allRoles;
    const excluded = descendantIds(role.id, allRoles);
    excluded.add(role.id);
    return allRoles.filter((r) => !excluded.has(r.id));
  }, [role, allRoles]);

  const inherited = useMemo(
    () => (role ? inheritedPermissions(role.id, allRoles) : new Set<string>()),
    [role, allRoles],
  );

  const togglePermission = (permission: string) => {
    setDirect((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) {
        next.delete(permission);
      } else {
        next.add(permission);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim() || (!isEdit && !code)) return;
    const permissions = wildcard ? [WILDCARD_PERMISSION] : [...direct].sort();
    const base = {
      name: name.trim(),
      parentId: parentId === NO_PARENT ? null : parentId,
      ...(isSystem ? {} : { permissions }),
    };
    await onSubmit(isEdit ? base : { ...base, code, permissions });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editRole') : t('createRole')}</DialogTitle>
          <DialogDescription>
            {isSystem ? t('systemRoleHint') : t('formDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role-name">{tc('name')}</Label>
            <Input
              id="role-name"
              value={name}
              maxLength={100}
              onChange={(e) => {
                setName(e.target.value);
                if (!isEdit) onNameChange(e.target.value);
              }}
            />
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="role-code">{tc('code')}</Label>
              <Input
                id="role-code"
                value={code}
                placeholder={tc('codePlaceholder')}
                onChange={(e) => onCodeChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{tc('codeImmutable')}</p>
            </div>
          )}

          {!isSystem && (
            <div className="space-y-2">
              <Label>{t('parent')}</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARENT}>{tc('none')}</SelectItem>
                  {parentOptions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('permissions')}</Label>

            {isSystem ? (
              <p className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {t('grantsEverything')}
              </p>
            ) : (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={wildcard}
                    onChange={(e) => setWildcard(e.target.checked)}
                  />
                  {t('grantEverything')}
                </label>

                {!wildcard && (
                  <div className="max-h-64 overflow-y-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b text-left text-xs text-muted-foreground">
                          <th className="px-3 py-2 font-medium">{t('resource')}</th>
                          <th className="w-16 px-2 py-2 text-center font-medium">{t('read')}</th>
                          <th className="w-16 px-2 py-2 text-center font-medium">{t('write')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resources.map((resource) => (
                          <tr key={resource} className="border-b last:border-0">
                            <td className="px-3 py-1.5 font-mono text-xs">{resource}</td>
                            {ACTIONS.map((action) => {
                              const permission = permissionFor(resource, action);
                              const isInherited =
                                inherited.has(WILDCARD_PERMISSION) || inherited.has(permission);
                              return (
                                <td key={action} className="px-2 py-1.5 text-center">
                                  {isInherited && !direct.has(permission) ? (
                                    <span title={t('inherited')}>
                                      <input type="checkbox" checked disabled />
                                    </span>
                                  ) : (
                                    <input
                                      type="checkbox"
                                      checked={direct.has(permission)}
                                      onChange={() => togglePermission(permission)}
                                    />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {inherited.size > 0 && !wildcard && (
                  <p className="text-xs text-muted-foreground">{t('inheritedHint')}</p>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || (!isEdit && !code) || isSubmitting}
          >
            {isSubmitting ? tc('saving') : isEdit ? tc('save') : tc('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
