'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { ApiKeySummary } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { useIsMobile } from '../../hooks/use-mobile';
import { getMobileColumnVisibility } from '../../lib/column-visibility';
import { DataTable } from '../shared/data-table';
import { ConfirmDeleteDialog } from '../shared/confirm-delete-dialog';
import { Button } from '../ui/button';
import { getApiKeyColumns } from './columns';
import { ApiKeyCreateDialog } from './api-key-create-dialog';

export function ApiKeysDataTable() {
  const t = useTranslations('apiKeys');
  const tc = useTranslations('common');
  const isMobile = useIsMobile();
  const [data, setData] = useState<ApiKeySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteKey, setDeleteKey] = useState<ApiKeySummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const result = await api.get<ApiKeySummary[]>('/api-keys');
      setData(result);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteKey) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api-keys/${deleteKey.id}`);
      toast.success(t('deleted'));
      setDeleteKey(null);
      fetchData();
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = getApiKeyColumns({
    onDelete: (apiKey) => setDeleteKey(apiKey),
    translations: {
      name: t('name'),
      key: t('key'),
      lastUsed: t('lastUsed'),
      expires: t('expires'),
      created: t('createdColumn'),
      never: t('never'),
      expired: t('expired'),
      delete: tc('delete'),
    },
  });

  const mobileVisibility = getMobileColumnVisibility(columns, isMobile);

  return (
    <div>
      <div className="flex justify-end py-4">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('createKey')}
        </Button>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">{tc('loading')}</div>
      ) : data.length === 0 ? (
        <div className="flex h-24 flex-col items-center justify-center gap-1 rounded-md border text-sm text-muted-foreground">
          {t('empty')}
        </div>
      ) : (
        <DataTable columns={columns} data={data} columnVisibility={mobileVisibility} />
      )}

      <ApiKeyCreateDialog open={formOpen} onOpenChange={setFormOpen} onCreated={fetchData} />

      <ConfirmDeleteDialog
        open={!!deleteKey}
        onOpenChange={(open) => !open && setDeleteKey(null)}
        onConfirm={handleDelete}
        title={t('deleteKey')}
        description={t('confirmDelete', { name: deleteKey?.name ?? '' })}
        isDeleting={isDeleting}
      />
    </div>
  );
}
