'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { ValueResponse, PaginatedResponse } from '@marketlum/shared';
import { ValueType, ValueLifecycleStage } from '@marketlum/shared';
import { api } from '@/lib/api-client';
import { usePagination } from '@/hooks/use-pagination';
import { useIsMobile } from '@/hooks/use-mobile';
import { getMobileColumnVisibility } from '@/lib/column-visibility';
import { DataTable } from '@/components/shared/data-table';
import { DataTablePagination } from '@/components/shared/data-table-pagination';
import { getValueColumns } from '@/components/values/columns';
import type { ColumnDef } from '@tanstack/react-table';

const typeTranslationKeys: Record<string, string> = {
  [ValueType.PRODUCT]: 'typeProduct',
  [ValueType.SERVICE]: 'typeService',
  [ValueType.RELATIONSHIP]: 'typeRelationship',
  [ValueType.RIGHT]: 'typeRight',
};

interface AgentValuesTableProps {
  agentId: string;
}

export function AgentValuesTable({ agentId }: AgentValuesTableProps) {
  const router = useRouter();
  const pagination = usePagination();
  const tv = useTranslations('values');
  const tc = useTranslations('common');
  const isMobile = useIsMobile();
  const [data, setData] = useState<PaginatedResponse<ValueResponse> | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = pagination.toQueryString() + `&agentId=${agentId}`;
      const result = await api.get<PaginatedResponse<ValueResponse>>(`/values?${qs}`);
      setData(result);
    } catch {
      toast.error(tv('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [pagination.toQueryString, agentId]);

  useEffect(() => {
    fetchData();
  }, [pagination.page, pagination.sortBy, pagination.sortOrder, fetchData]);

  const typeLabels: Record<string, string> = {};
  for (const valueType of Object.values(ValueType)) {
    typeLabels[valueType] = tv(typeTranslationKeys[valueType]);
  }

  const lifecycleStageLabels: Record<string, string> = {};
  for (const stage of Object.values(ValueLifecycleStage)) {
    const key = `lifecycle${stage.charAt(0).toUpperCase()}${stage.slice(1)}`;
    lifecycleStageLabels[stage] = tv(key);
  }

  const allColumns = getValueColumns({
    onEdit: () => {},
    onDuplicate: () => {},
    onDelete: () => {},
    onSort: pagination.setSort,
    translations: {
      name: tc('name'),
      type: tc('type'),
      taxonomy: tv('taxonomy'),
      agent: tv('agent'),
      valueStream: tv('valueStream'),
      abstract: tv('abstract'),
      lifecycleStage: tv('lifecycleStage'),
      lifecycleStageLabels,
      image: tv('image'),
      purpose: tv('purpose'),
      created: tc('created'),
      edit: tc('edit'),
      duplicate: tc('duplicate'),
      delete: tc('delete'),
      typeLabels,
    },
  });

  // Remove actions and agent columns — actions aren't needed, agent is redundant
  const columns = allColumns.filter(
    (col) => {
      const id = (col as { id?: string }).id ?? (col as { accessorKey?: string }).accessorKey;
      return id !== 'actions' && id !== 'agent';
    },
  ) as ColumnDef<ValueResponse, unknown>[];

  return (
    <div>
      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">{tc('loading')}</div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            columnVisibility={getMobileColumnVisibility(columns, isMobile)}
            onRowClick={(value) => router.push(`/admin/values/${value.id}`)}
          />
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
    </div>
  );
}
