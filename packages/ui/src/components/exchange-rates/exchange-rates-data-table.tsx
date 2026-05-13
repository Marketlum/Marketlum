'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type {
  CreateExchangeRateInput,
  ExchangeRateResponse,
  PaginatedResponse,
} from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { usePagination } from '../../hooks/use-pagination';
import { useIsMobile } from '../../hooks/use-mobile';
import { getMobileColumnVisibility } from '../../lib/column-visibility';
import { DataTable } from '../shared/data-table';
import { DataTablePagination } from '../shared/data-table-pagination';
import { ConfirmDeleteDialog } from '../shared/confirm-delete-dialog';
import { Button } from '../ui/button';
import { getExchangeRateColumns } from './columns';
import { ExchangeRateFormDialog } from './exchange-rate-form-dialog';
import { BaseValuePicker } from './base-value-picker';

export function ExchangeRatesDataTable() {
  const pagination = usePagination({ sortBy: 'effectiveAt', sortOrder: 'DESC' });
  const t = useTranslations('exchangeRates');
  const tc = useTranslations('common');
  const isMobile = useIsMobile();
  const [data, setData] = useState<PaginatedResponse<ExchangeRateResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExchangeRateResponse | null>(null);
  const [deletingRate, setDeletingRate] = useState<ExchangeRateResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = pagination.toQueryString();
      const result = await api.get<PaginatedResponse<ExchangeRateResponse>>(
        `/exchange-rates?${qs}`,
      );
      setData(result);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [pagination.toQueryString, t]);

  useEffect(() => {
    fetchData();
  }, [pagination.page, pagination.sortBy, pagination.sortOrder, fetchData]);

  const handleCreate = async (input: CreateExchangeRateInput) => {
    setIsSubmitting(true);
    try {
      if (editing) {
        await api.patch(`/exchange-rates/${editing.id}`, input);
        toast.success(t('updated'));
      } else {
        await api.post('/exchange-rates', input);
        toast.success(t('created'));
      }
      setFormOpen(false);
      setEditing(null);
      fetchData();
    } catch (err) {
      const message =
        (err as Error).message ||
        (editing ? t('failedToUpdate') : t('failedToCreate'));
      toast.error(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRate) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/exchange-rates/${deletingRate.id}`);
      toast.success(t('deleted'));
      setDeletingRate(null);
      fetchData();
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = getExchangeRateColumns({
    onEdit: (rate) => {
      setEditing(rate);
      setFormOpen(true);
    },
    onDelete: (rate) => setDeletingRate(rate),
    onSort: pagination.setSort,
    translations: {
      pair: t('pair'),
      rate: t('rate'),
      inverse: t('inverse'),
      effectiveAt: t('effectiveAt'),
      source: t('source'),
      edit: tc('edit'),
      delete: tc('delete'),
    },
  });

  const mobileVisibility = getMobileColumnVisibility(columns, isMobile);

  return (
    <div className="flex flex-col gap-4">
      <BaseValuePicker onChange={fetchData} />

      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('createRate')}
        </Button>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">
          {tc('loading')}
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            columnVisibility={mobileVisibility}
          />
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

      <ExchangeRateFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        onSubmit={handleCreate}
        rate={editing}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={!!deletingRate}
        onOpenChange={(open) => !open && setDeletingRate(null)}
        onConfirm={handleDelete}
        title={t('deleteRate')}
        description={tc('confirmDeleteDescription', {
          name: deletingRate
            ? `${deletingRate.fromValue.name} ⇄ ${deletingRate.toValue.name}`
            : '',
        })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
