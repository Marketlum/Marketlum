'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { LocaleResponse, PaginatedResponse } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { usePagination } from '../../hooks/use-pagination';
import { useIsMobile } from '../../hooks/use-mobile';
import { getMobileColumnVisibility } from '../../lib/column-visibility';
import { DataTable } from '../shared/data-table';
import { DataTablePagination } from '../shared/data-table-pagination';
import { ConfirmDeleteDialog } from '../shared/confirm-delete-dialog';
import { Button } from '../ui/button';
import { getLocaleColumns } from './columns';
import { LocaleCreateDialog } from './locale-create-dialog';

export function LocalesDataTable() {
  const pagination = usePagination({ sortBy: 'code', sortOrder: 'ASC' });
  const t = useTranslations('locales');
  const tc = useTranslations('common');
  const isMobile = useIsMobile();
  const [data, setData] = useState<PaginatedResponse<LocaleResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteLocale, setDeleteLocale] = useState<LocaleResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = pagination.toQueryString();
      const result = await api.get<PaginatedResponse<LocaleResponse>>(`/locales?${qs}`);
      setData(result);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [pagination.toQueryString]);

  useEffect(() => {
    fetchData();
  }, [pagination.page, pagination.sortBy, pagination.sortOrder, fetchData]);

  const handleCreate = async (code: string) => {
    setIsSubmitting(true);
    try {
      await api.post('/locales', { code });
      toast.success(t('created'));
      setFormOpen(false);
      fetchData();
    } catch {
      toast.error(t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteLocale) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/locales/${deleteLocale.id}`);
      toast.success(t('deleted'));
      setDeleteLocale(null);
      fetchData();
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = getLocaleColumns({
    onDelete: (locale) => setDeleteLocale(locale),
    onSort: pagination.setSort,
    translations: {
      code: t('code'),
      language: t('language'),
      region: t('region'),
      delete: tc('delete'),
    },
  });

  const mobileVisibility = getMobileColumnVisibility(columns, isMobile);

  return (
    <div>
      <div className="flex justify-end py-4">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('createLocale')}
        </Button>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">{tc('loading')}</div>
      ) : (
        <>
          <DataTable columns={columns} data={data?.data ?? []} columnVisibility={mobileVisibility} />
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

      <LocaleCreateDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        existingCodes={data?.data.map((l) => l.code) ?? []}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={!!deleteLocale}
        onOpenChange={(open) => !open && setDeleteLocale(null)}
        onConfirm={handleDelete}
        title={t('deleteLocale')}
        description={tc('confirmDeleteDescription', { name: deleteLocale?.code ?? '' })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
