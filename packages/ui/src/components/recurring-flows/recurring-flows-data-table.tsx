'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type {
  CreateRecurringFlowInput,
  PaginatedResponse,
  RecurringFlowResponse,
} from '@marketlum/shared';
import {
  RecurringFlowDirection,
  RecurringFlowFrequency,
  RecurringFlowStatus,
} from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { usePagination } from '../../hooks/use-pagination';
import { useDebounce } from '../../hooks/use-debounce';
import { DataTable } from '../shared/data-table';
import { DataTablePagination } from '../shared/data-table-pagination';
import { DataTableToolbar } from '../shared/data-table-toolbar';
import { ConfirmDeleteDialog } from '../shared/confirm-delete-dialog';
import { useIsMobile } from '../../hooks/use-mobile';
import { getMobileColumnVisibility, mergeColumnVisibility } from '../../lib/column-visibility';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { getRecurringFlowColumns } from './columns';
import { RecurringFlowFormDialog } from './recurring-flow-form-dialog';

interface RecurringFlowsDataTableProps {
  valueStreamId?: string;
}

export function RecurringFlowsDataTable({ valueStreamId }: RecurringFlowsDataTableProps) {
  const t = useTranslations('recurringFlows');
  const tc = useTranslations('common');
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);
  const isMobile = useIsMobile();
  const [data, setData] = useState<PaginatedResponse<RecurringFlowResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<RecurringFlowResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecurringFlowResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let qs = pagination.toQueryString();
      if (valueStreamId) qs += `&valueStreamId=${valueStreamId}`;
      if (directionFilter !== 'all') qs += `&direction=${directionFilter}`;
      if (statusFilter !== 'all') qs += `&status=${statusFilter}`;
      const result = await api.get<PaginatedResponse<RecurringFlowResponse>>(`/recurring-flows?${qs}`);
      setData(result);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [pagination.toQueryString, valueStreamId, directionFilter, statusFilter, t]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, pagination.page, pagination.sortBy, pagination.sortOrder, pagination.limit, directionFilter, statusFilter, fetchData]);

  const handleOpenCreate = () => {
    setEditingFlow(null);
    setFormOpen(true);
  };

  const handleOpenEdit = async (flow: RecurringFlowResponse) => {
    try {
      const full = await api.get<RecurringFlowResponse>(`/recurring-flows/${flow.id}`);
      setEditingFlow(full);
      setFormOpen(true);
    } catch {
      toast.error(t('failedToLoad'));
    }
  };

  const handleFormSubmit = async (input: CreateRecurringFlowInput) => {
    setIsSubmitting(true);
    try {
      if (editingFlow) {
        await api.patch(`/recurring-flows/${editingFlow.id}`, input);
        toast.success(t('updated'));
      } else {
        await api.post('/recurring-flows', input);
        toast.success(t('created'));
      }
      setFormOpen(false);
      setEditingFlow(null);
      fetchData();
    } catch {
      toast.error(editingFlow ? t('failedToUpdate') : t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/recurring-flows/${deleteTarget.id}`);
      toast.success(t('deleted'));
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransition = async (
    flow: RecurringFlowResponse,
    action: 'activate' | 'pause' | 'resume' | 'end',
  ) => {
    try {
      const body: Record<string, unknown> = { action };
      if (action === 'end') {
        const today = new Date().toISOString().slice(0, 10);
        body.endDate = today;
      }
      await api.post(`/recurring-flows/${flow.id}/transitions`, body);
      toast.success(t(`transition.${action}.success`));
      fetchData();
    } catch {
      toast.error(t(`transition.${action}.error`));
    }
  };

  const columns = getRecurringFlowColumns({
    onEdit: handleOpenEdit,
    onDelete: (flow) => setDeleteTarget(flow),
    onTransition: handleTransition,
    onSort: pagination.setSort,
    showValueStreamColumn: !valueStreamId,
    translations: {
      direction: t('direction'),
      counterparty: t('counterparty'),
      value: t('value'),
      description: t('description'),
      amount: t('amount'),
      inBase: t('inBase'),
      noRate: t('noRate'),
      frequency: t('frequency'),
      startDate: t('startDate'),
      status: t('status'),
      valueStream: t('valueStream'),
      edit: tc('edit'),
      delete: tc('delete'),
      activate: t('actionActivate'),
      pause: t('actionPause'),
      resume: t('actionResume'),
      end: t('actionEnd'),
      statusDraft: t('statusDraft'),
      statusActive: t('statusActive'),
      statusPaused: t('statusPaused'),
      statusEnded: t('statusEnded'),
    },
  });

  const mobileVisibility = getMobileColumnVisibility(columns, isMobile);
  const mergedVisibility = mergeColumnVisibility(columnVisibility, mobileVisibility);

  return (
    <div>
      <DataTableToolbar
        searchValue={pagination.search}
        onSearchChange={pagination.setSearch}
        onCreateClick={handleOpenCreate}
        createLabel={t('createFlow')}
      >
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">{t('direction')}</Label>
          <Select value={directionFilter} onValueChange={setDirectionFilter}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tc('all')}</SelectItem>
              <SelectItem value={RecurringFlowDirection.INBOUND}>{t('directionInbound')}</SelectItem>
              <SelectItem value={RecurringFlowDirection.OUTBOUND}>{t('directionOutbound')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">{t('status')}</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tc('all')}</SelectItem>
              <SelectItem value={RecurringFlowStatus.DRAFT}>{t('statusDraft')}</SelectItem>
              <SelectItem value={RecurringFlowStatus.ACTIVE}>{t('statusActive')}</SelectItem>
              <SelectItem value={RecurringFlowStatus.PAUSED}>{t('statusPaused')}</SelectItem>
              <SelectItem value={RecurringFlowStatus.ENDED}>{t('statusEnded')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
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

      <RecurringFlowFormDialog
        open={formOpen && !editingFlow}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        defaultValueStreamId={valueStreamId}
        isSubmitting={isSubmitting}
      />

      <RecurringFlowFormDialog
        open={!!editingFlow}
        onOpenChange={(open) => { if (!open) { setEditingFlow(null); setFormOpen(false); } }}
        onSubmit={handleFormSubmit}
        flow={editingFlow}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('deleteFlow')}
        description={tc('confirmDeleteDescription', { name: deleteTarget?.description ?? '' })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
