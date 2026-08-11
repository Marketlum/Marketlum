'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { ColumnDef } from '@tanstack/react-table';
import type { AuditLogResponse, PaginatedResponse } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { usePagination } from '../../hooks/use-pagination';
import { useIsMobile } from '../../hooks/use-mobile';
import { getMobileColumnVisibility } from '../../lib/column-visibility';
import { useDebounce } from '../../hooks/use-debounce';
import { DataTable } from '../shared/data-table';
import { DataTablePagination } from '../shared/data-table-pagination';
import { DataTableToolbar } from '../shared/data-table-toolbar';
import { ExportDropdown } from '../shared/export-dropdown';
import type { FieldDef } from '../../lib/export-utils';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { formatAuditEntityType } from '../../lib/format-audit-entity';
import { AuditActorBadge } from './audit-actor-badge';
import { AuditEntryDialog } from './audit-entry-dialog';

/** Reads initial filters from the URL and writes changes back (deep-linkable views). */
function useUrlFilter(key: string, fallback: string) {
  const searchParams = useSearchParams();
  const [value, setValue] = useState<string>(searchParams.get(key) ?? fallback);
  const router = useRouter();
  const update = useCallback(
    (next: string) => {
      setValue(next);
      const params = new URLSearchParams(window.location.search);
      if (next && next !== fallback) params.set(key, next);
      else params.delete(key);
      router.replace(`${window.location.pathname}?${params.toString()}`);
    },
    [key, fallback, router],
  );
  return [value, update] as const;
}

export function ActivityDataTable() {
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);
  const t = useTranslations('audit');
  const tc = useTranslations('common');
  const isMobile = useIsMobile();
  const [data, setData] = useState<PaginatedResponse<AuditLogResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AuditLogResponse | null>(null);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);

  useEffect(() => {
    api
      .get<string[]>('/audit-logs/entity-types')
      .then(setEntityTypes)
      .catch(() => setEntityTypes([]));
  }, []);

  const [actorKind, setActorKind] = useUrlFilter('actorKind', 'all');
  const [category, setCategory] = useUrlFilter('category', 'all');
  const [entityType, setEntityType] = useUrlFilter('entityType', 'all');
  const [entityId] = useState<string>(
    () => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search).get('entityId') ?? '',
  );
  const [from, setFrom] = useUrlFilter('from', '');
  const [to, setTo] = useUrlFilter('to', '');

  const buildFilterQs = useCallback(() => {
    let qs = '';
    if (actorKind !== 'all') qs += `&actorKind=${actorKind}`;
    if (category !== 'all') qs += `&category=${category}`;
    if (entityType !== 'all') qs += `&entityType=${encodeURIComponent(entityType)}`;
    if (entityId) qs += `&entityId=${entityId}`;
    if (from) qs += `&from=${from}`;
    if (to) qs += `&to=${to}`;
    return qs;
  }, [actorKind, category, entityType, entityId, from, to]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = pagination.toQueryString() + buildFilterQs();
      setData(await api.get<PaginatedResponse<AuditLogResponse>>(`/audit-logs?${qs}`));
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [pagination.toQueryString, buildFilterQs, t]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, pagination.page, actorKind, category, entityType, from, to, fetchData]);

  const columns: ColumnDef<AuditLogResponse>[] = [
    {
      accessorKey: 'createdAt',
      header: t('when'),
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
    },
    {
      id: 'actor',
      header: t('actor'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <AuditActorBadge
            kind={row.original.actorKind}
            label={t(`kind_${row.original.actorKind}`)}
          />
          <span className="hidden max-w-[220px] truncate text-sm sm:inline">
            {row.original.userEmail ?? '-'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'category',
      meta: { hideOnMobile: true },
      header: t('category'),
      cell: ({ row }) => t(`category_${row.original.category}`),
    },
    {
      accessorKey: 'action',
      header: t('action'),
      cell: ({ row }) => <code className="text-xs">{row.original.action ?? '-'}</code>,
    },
    {
      id: 'entity',
      meta: { hideOnMobile: true },
      header: t('entity'),
      cell: ({ row }) =>
        row.original.entityType ? (
          <span className="text-xs text-muted-foreground">
            {formatAuditEntityType(row.original.entityType)} · {row.original.entityId?.slice(0, 8) ?? ''}
          </span>
        ) : (
          '-'
        ),
    },
  ];

  const exportFields: FieldDef[] = [
    { key: 'createdAt', label: t('when'), extract: (r) => String(r.createdAt ?? '') },
    { key: 'actorKind', label: t('actor'), extract: (r) => String(r.actorKind ?? '') },
    { key: 'userEmail', label: tc('email'), extract: (r) => String(r.userEmail ?? '') },
    { key: 'category', label: t('category'), extract: (r) => String(r.category ?? '') },
    { key: 'action', label: t('action'), extract: (r) => String(r.action ?? '') },
    { key: 'entityType', label: t('entity'), extract: (r) => String(r.entityType ?? '') },
    { key: 'entityId', label: 'entityId', extract: (r) => String(r.entityId ?? '') },
    { key: 'ip', label: t('ipAddress'), extract: (r) => String(r.ip ?? '') },
  ];

  const fetchAllData = useCallback(async () => {
    const qs = `page=1&limit=10000${buildFilterQs()}${
      pagination.search ? `&search=${encodeURIComponent(pagination.search)}` : ''
    }`;
    const result = await api.get<PaginatedResponse<AuditLogResponse>>(`/audit-logs?${qs}`);
    return result.data as unknown as Record<string, unknown>[];
  }, [buildFilterQs, pagination.search]);

  return (
    <div>
      <DataTableToolbar searchValue={pagination.search} onSearchChange={pagination.setSearch}>
        <Select value={actorKind} onValueChange={setActorKind}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allKinds')}</SelectItem>
            <SelectItem value="human">{t('kind_human')}</SelectItem>
            <SelectItem value="agent">{t('kind_agent')}</SelectItem>
            <SelectItem value="system">{t('kind_system')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allCategories')}</SelectItem>
            <SelectItem value="mutation">{t('category_mutation')}</SelectItem>
            <SelectItem value="mcp_call">{t('category_mcp_call')}</SelectItem>
            <SelectItem value="auth">{t('category_auth')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('allEntities')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allEntities')}</SelectItem>
            {entityTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {formatAuditEntityType(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">{t('from')}</span>
          <Input
            type="date"
            className="w-[150px]"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label={t('from')}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">{t('to')}</span>
          <Input
            type="date"
            className="w-[150px]"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label={t('to')}
          />
        </div>
        <ExportDropdown
          visibleData={(data?.data ?? []) as unknown as Record<string, unknown>[]}
          fetchAllData={fetchAllData}
          fields={exportFields}
          visibleFields={exportFields}
          filenameBase="activity"
        />
      </DataTableToolbar>

      {loading && !data ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">
          {tc('loading')}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          columnVisibility={getMobileColumnVisibility(columns, isMobile)}
          onRowClick={(row) => setSelected(row)}
        />
      )}

      <DataTablePagination
        page={data?.meta.page ?? 1}
        totalPages={data?.meta.totalPages ?? 1}
        total={data?.meta.total ?? 0}
        onPageChange={pagination.setPage}
      />

      <AuditEntryDialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        entry={selected}
      />
    </div>
  );
}
