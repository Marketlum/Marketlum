'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { UserResponse, PaginatedResponse, CreateUserInput, ChangeUserPasswordInput, PerspectiveConfig } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { usePagination } from '../../hooks/use-pagination';
import { useDebounce } from '../../hooks/use-debounce';
import { usePerspectives } from '../../hooks/use-perspectives';
import { DataTable } from '../shared/data-table';
import { DataTablePagination } from '../shared/data-table-pagination';
import { DataTableToolbar } from '../shared/data-table-toolbar';
import { ConfirmDeleteDialog } from '../shared/confirm-delete-dialog';
import { ColumnVisibilityDropdown } from '../shared/column-visibility-dropdown';
import { PerspectiveSelector } from '../shared/perspective-selector';
import { useIsMobile } from '../../hooks/use-mobile';
import { getMobileColumnVisibility, mergeColumnVisibility } from '../../lib/column-visibility';
import { UserFormDialog } from './user-form-dialog';
import { ChangePasswordDialog } from './change-password-dialog';
import { getUserColumns } from './columns';
import { ExportDropdown } from '../shared/export-dropdown';
import type { FieldDef } from '../../lib/export-utils';

export function UsersDataTable() {
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const tp = useTranslations('perspectives');
  const isMobile = useIsMobile();
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<PaginatedResponse<UserResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [passwordUser, setPasswordUser] = useState<UserResponse | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onApplyPerspective = useCallback((config: PerspectiveConfig) => {
    setColumnVisibility(config.columnVisibility ?? {});
    if (config.sort) {
      pagination.setSortDirect(config.sort.sortBy, config.sort.sortOrder);
    } else {
      pagination.setSortDirect('', 'ASC');
    }
  }, [pagination.setSortDirect]);

  const perspectiveTranslations = {
    saved: tp('saved'),
    updated: tp('updated'),
    deleted: tp('deleted'),
    failedToLoad: tp('failedToLoad'),
    failedToSave: tp('failedToSave'),
    failedToUpdate: tp('failedToUpdate'),
    failedToDelete: tp('failedToDelete'),
  };

  const {
    perspectives,
    activePerspectiveId,
    selectPerspective,
    savePerspective,
    updatePerspective,
    deletePerspective,
    resetPerspective,
  } = usePerspectives({
    table: 'users',
    onApply: onApplyPerspective,
    translations: perspectiveTranslations,
  });

  const getCurrentConfig = useCallback((): PerspectiveConfig => ({
    columnVisibility,
    filters: {},
    sort: pagination.sortBy ? { sortBy: pagination.sortBy, sortOrder: pagination.sortOrder } : null,
  }), [columnVisibility, pagination.sortBy, pagination.sortOrder]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = pagination.toQueryString();
      const result = await api.get<PaginatedResponse<UserResponse>>(`/users?${qs}`);
      setData(result);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [pagination.toQueryString]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, pagination.page, pagination.sortBy, pagination.sortOrder, fetchData]);

  const handleCreate = async (input: CreateUserInput) => {
    setIsSubmitting(true);
    try {
      await api.post('/users', input);
      toast.success(t('created'));
      setFormOpen(false);
      fetchData();
    } catch {
      toast.error(t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (input: CreateUserInput) => {
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {};
      if (input.name) body.name = input.name;
      if (input.email) body.email = input.email;
      if (input.avatarId !== undefined) body.avatarId = input.avatarId;
      await api.patch(`/users/${editingUser.id}`, body);
      toast.success(t('updated'));
      setEditingUser(null);
      fetchData();
    } catch {
      toast.error(t('failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (input: ChangeUserPasswordInput) => {
    if (!passwordUser) return;
    setIsSubmitting(true);
    try {
      await api.post(`/users/${passwordUser.id}/change-password`, input);
      toast.success(t('passwordChanged'));
      setPasswordUser(null);
    } catch {
      toast.error(t('failedToChangePassword'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/users/${deleteUser.id}`);
      toast.success(t('deleted'));
      setDeleteUser(null);
      fetchData();
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = getUserColumns({
    onEdit: (user) => setEditingUser(user),
    onChangePassword: (user) => setPasswordUser(user),
    onDelete: (user) => setDeleteUser(user),
    onSort: pagination.setSort,
    translations: {
      avatar: t('avatar'),
      name: tc('name'),
      email: tc('email'),
      created: tc('created'),
      edit: tc('edit'),
      changePassword: t('changePassword'),
      delete: tc('delete'),
    },
  });

  const columnMeta = [
    { id: 'avatar', label: t('avatar') },
    { id: 'name', label: tc('name') },
    { id: 'email', label: tc('email') },
    { id: 'createdAt', label: tc('created') },
  ];

  const allExportFields: FieldDef[] = [
    { key: 'name', label: tc('name'), extract: (r) => String(r.name ?? '') },
    { key: 'email', label: tc('email'), extract: (r) => String(r.email ?? '') },
    { key: 'createdAt', label: tc('created'), extract: (r) => String(r.createdAt ?? '') },
    { key: 'updatedAt', label: t('updatedAt'), extract: (r) => String(r.updatedAt ?? '') },
  ];

  const visibleExportFields = allExportFields.filter(
    (f) => columnVisibility[f.key] !== false,
  );

  const fetchAllData = useCallback(async () => {
    let qs = `page=1&limit=10000`;
    if (pagination.search) qs += `&search=${encodeURIComponent(pagination.search)}`;
    if (pagination.sortBy) qs += `&sortBy=${pagination.sortBy}&sortOrder=${pagination.sortOrder}`;
    const result = await api.get<PaginatedResponse<UserResponse>>(`/users?${qs}`);
    return result.data as unknown as Record<string, unknown>[];
  }, [pagination.search, pagination.sortBy, pagination.sortOrder]);

  const mobileVisibility = getMobileColumnVisibility(columns, isMobile);
  const mergedVisibility = mergeColumnVisibility(columnVisibility, mobileVisibility);

  return (
    <div>
      <DataTableToolbar
        searchValue={pagination.search}
        onSearchChange={pagination.setSearch}
        onCreateClick={() => setFormOpen(true)}
        createLabel={t('createUser')}
      >
        <ColumnVisibilityDropdown
          columns={columnMeta}
          visibility={columnVisibility}
          onVisibilityChange={(id, visible) =>
            setColumnVisibility((prev) => ({ ...prev, [id]: visible }))
          }
          label={tp('columns')}
        />
        <PerspectiveSelector
          perspectives={perspectives}
          activePerspectiveId={activePerspectiveId}
          onSelect={selectPerspective}
          onSave={savePerspective}
          onUpdate={updatePerspective}
          onDelete={deletePerspective}
          onReset={resetPerspective}
          getCurrentConfig={getCurrentConfig}
          translations={{
            perspectives: tp('perspectives'),
            savePerspective: tp('savePerspective'),
            updatePerspective: tp('updatePerspective'),
            deletePerspective: tp('deletePerspective'),
            setAsDefault: tp('setAsDefault'),
            removeDefault: tp('removeDefault'),
            reset: tp('reset'),
            namePlaceholder: tp('namePlaceholder'),
            noPerspectives: tp('noPerspectives'),
          }}
        />
        <ExportDropdown
          visibleData={(data?.data ?? []) as unknown as Record<string, unknown>[]}
          fetchAllData={fetchAllData}
          fields={allExportFields}
          visibleFields={visibleExportFields}
          filenameBase="users"
        />
      </DataTableToolbar>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">{tc('loading')}</div>
      ) : (
        <>
          <DataTable columns={columns} data={data?.data ?? []} columnVisibility={mergedVisibility} />
          {data && (
            <DataTablePagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              limit={pagination.limit}
              onPageChange={pagination.setPage}
              onLimitChange={pagination.setLimit}
            />
          )}
        </>
      )}

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      <UserFormDialog
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        onSubmit={handleEdit}
        user={editingUser}
        isSubmitting={isSubmitting}
      />

      <ChangePasswordDialog
        open={!!passwordUser}
        onOpenChange={(open) => !open && setPasswordUser(null)}
        onSubmit={handleChangePassword}
        user={passwordUser}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={!!deleteUser}
        onOpenChange={(open) => !open && setDeleteUser(null)}
        onConfirm={handleDelete}
        title={t('deleteUser')}
        description={tc('confirmDeleteDescription', { name: deleteUser?.name ?? '' })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
