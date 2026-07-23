'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Lock, MoreHorizontal, Pencil, Trash2, CornerDownRight } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import {
  WILDCARD_PERMISSION,
  type RoleResponse,
  type PermissionCatalogResponse,
  type CreateRoleInput,
  type UpdateRoleInput,
} from '@marketlum/shared';
import { api, ApiError } from '../../lib/api-client';
import { Can } from '../../permissions/can';
import { usePermissions } from '../../permissions/permissions-context';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { ConfirmDeleteDialog } from '../shared/confirm-delete-dialog';
import { RoleFormDialog } from './role-form-dialog';
import { toTreeRows } from './role-tree';

export function RolesDataTable() {
  const t = useTranslations('roles');
  const tc = useTranslations('common');
  const { can } = usePermissions();
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [resources, setResources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleResponse | null>(null);
  const [deleteRole, setDeleteRole] = useState<RoleResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canWrite = can('roles', 'write');

  const fetchData = useCallback(async () => {
    try {
      const [rolesResult, catalogResult] = await Promise.all([
        api.get<RoleResponse[]>('/roles'),
        api.get<PermissionCatalogResponse>('/roles/permission-catalog'),
      ]);
      setRoles(rolesResult);
      setResources(catalogResult.resources);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const errorMessage = (error: unknown, fallback: string) =>
    error instanceof ApiError && error.message ? error.message : fallback;

  const handleCreate = async (input: CreateRoleInput | UpdateRoleInput) => {
    setIsSubmitting(true);
    try {
      await api.post('/roles', input);
      toast.success(t('created'));
      setFormOpen(false);
      fetchData();
    } catch (error) {
      toast.error(errorMessage(error, t('failedToCreate')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (input: CreateRoleInput | UpdateRoleInput) => {
    if (!editingRole) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/roles/${editingRole.id}`, input);
      toast.success(t('updated'));
      setEditingRole(null);
      fetchData();
    } catch (error) {
      toast.error(errorMessage(error, t('failedToUpdate')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRole) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/roles/${deleteRole.id}`);
      toast.success(t('deleted'));
      setDeleteRole(null);
      fetchData();
    } catch (error) {
      toast.error(errorMessage(error, t('failedToDelete')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const rows = toTreeRows(roles);

  return (
    <div>
      <div className="flex justify-end py-4">
        <Can resource="roles" action="write">
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('createRole')}
          </Button>
        </Can>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">{tc('loading')}</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tc('name')}</TableHead>
                <TableHead>{tc('code')}</TableHead>
                <TableHead>{t('permissions')}</TableHead>
                {canWrite && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ role, depth }) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <span
                      className="flex items-center gap-2 font-medium"
                      style={{ paddingLeft: `${depth * 1.25}rem` }}
                    >
                      {depth > 0 && (
                        <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {role.name}
                      {role.isSystem && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                    </span>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{role.code}</code>
                  </TableCell>
                  <TableCell>
                    {role.permissions.includes(WILDCARD_PERMISSION) ? (
                      <Badge>{t('everything')}</Badge>
                    ) : (
                      <Badge variant="secondary">
                        {t('permissionCount', { count: role.permissions.length })}
                      </Badge>
                    )}
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingRole(role)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {tc('edit')}
                          </DropdownMenuItem>
                          {!role.isSystem && (
                            <DropdownMenuItem
                              onClick={() => setDeleteRole(role)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {tc('delete')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <RoleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        allRoles={roles}
        resources={resources}
        isSubmitting={isSubmitting}
      />

      <RoleFormDialog
        open={!!editingRole}
        onOpenChange={(open) => !open && setEditingRole(null)}
        onSubmit={handleEdit}
        allRoles={roles}
        resources={resources}
        role={editingRole}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={!!deleteRole}
        onOpenChange={(open) => !open && setDeleteRole(null)}
        onConfirm={handleDelete}
        title={t('deleteRole')}
        description={tc('confirmDeleteDescription', { name: deleteRole?.name ?? '' })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
