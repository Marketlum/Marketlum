'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, ArrowRightLeft } from 'lucide-react';
import type { CreateValueInput, CreateExchangeInput } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { toast } from 'sonner';
import { ValueFormDialog } from '../../components/values/value-form-dialog';
import { ExchangeFormDialog } from '../../components/exchanges/exchange-form-dialog';
import { Button } from '../../components/ui/button';

export function ValueStreamDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const t = useTranslations('valueStreamSections');
  const tvs = useTranslations('valueStreams');
  const tv = useTranslations('values');
  const te = useTranslations('exchanges');

  const [createValueOpen, setCreateValueOpen] = useState(false);
  const [createExchangeOpen, setCreateExchangeOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateValue = async (input: CreateValueInput) => {
    setIsSubmitting(true);
    try {
      await api.post('/values', input);
      toast.success(tv('created'));
      setCreateValueOpen(false);
    } catch {
      toast.error(tv('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateExchange = async (input: CreateExchangeInput) => {
    setIsSubmitting(true);
    try {
      await api.post('/exchanges', input);
      toast.success(te('created'));
      setCreateExchangeOpen(false);
    } catch {
      toast.error(te('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setCreateValueOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {t('createValue')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setCreateExchangeOpen(true)}>
          <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
          {t('createExchange')}
        </Button>
      </div>

      {/* Dialogs */}
      <ValueFormDialog
        open={createValueOpen}
        onOpenChange={setCreateValueOpen}
        onSubmit={handleCreateValue}
        initialData={{ valueStream: { id, name: '' } } as never}
        isSubmitting={isSubmitting}
      />

      <ExchangeFormDialog
        open={createExchangeOpen}
        onOpenChange={setCreateExchangeOpen}
        onSubmit={handleCreateExchange}
        initialValueStreamId={id}
        isSubmitting={isSubmitting}
      />

    </div>
  );
}
