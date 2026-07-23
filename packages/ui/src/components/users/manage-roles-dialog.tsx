'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { RoleResponse, UserResponse } from '@marketlum/shared';
import { api, ApiError } from '../../lib/api-client';
import { usePermissions } from '../../permissions/permissions-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';

interface ManageRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserResponse | null;
  onSaved: () => void;
}

export function ManageRolesDialog({ open, onOpenChange, user, onSaved }: ManageRolesDialogProps) {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const { userId: myUserId, refresh } = usePermissions();
  const [allRoles, setAllRoles] = useState<RoleResponse[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setSelected(new Set((user.roles ?? []).map((r) => r.id)));
    api
      .get<RoleResponse[]>('/roles')
      .then(setAllRoles)
      .catch(() => toast.error(t('failedToLoadRoles')));
  }, [open, user, t]);

  const toggle = (roleId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await api.put(`/users/${user.id}/roles`, { roleIds: [...selected] });
      toast.success(t('rolesUpdated'));
      // Editing your own roles changes what the UI should show — refresh the
      // permission snapshot so the sidebar and gates update immediately.
      if (user.id === myUserId) {
        await refresh();
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof ApiError && error.message ? error.message : t('failedToUpdateRoles'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('manageRoles')}</DialogTitle>
          <DialogDescription>
            {t('manageRolesDescription', { name: user?.name ?? '' })}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 space-y-1 overflow-y-auto">
          {allRoles.map((role) => (
            <label
              key={role.id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
            >
              <input
                type="checkbox"
                checked={selected.has(role.id)}
                onChange={() => toggle(role.id)}
              />
              <span className="font-medium">{role.name}</span>
              <code className="text-xs text-muted-foreground">{role.code}</code>
            </label>
          ))}
          {allRoles.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">{tc('loading')}</p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? tc('saving') : tc('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
