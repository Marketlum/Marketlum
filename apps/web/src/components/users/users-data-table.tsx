'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { UserResponse, PaginatedResponse, CreateUserInput } from '@marketlum/shared';
import { api } from '@/lib/api-client';
import { usePagination } from '@/hooks/use-pagination';
import { useDebounce } from '@/hooks/use-debounce';
import { DataTable } from '@/components/shared/data-table';
import { DataTablePagination } from '@/components/shared/data-table-pagination';
import { DataTableToolbar } from '@/components/shared/data-table-toolbar';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { UserFormDialog } from './user-form-dialog';
import { getUserColumns } from './columns';

export function UsersDataTable() {
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const [data, setData] = useState<PaginatedResponse<UserResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const body: Record<string, string> = {};
      if (input.name) body.name = input.name;
      if (input.email) body.email = input.email;
      if (input.password) body.password = input.password;
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
    onDelete: (user) => setDeleteUser(user),
    onSort: pagination.setSort,
    translations: {
      name: tc('name'),
      email: tc('email'),
      created: tc('created'),
      edit: tc('edit'),
      delete: tc('delete'),
    },
  });

  return (
    <div>
      <DataTableToolbar
        searchValue={pagination.search}
        onSearchChange={pagination.setSearch}
        onCreateClick={() => setFormOpen(true)}
        createLabel={t('createUser')}
      />

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">{tc('loading')}</div>
      ) : (
        <>
          <DataTable columns={columns} data={data?.data ?? []} />
          {data && (
            <DataTablePagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              onPageChange={pagination.setPage}
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
