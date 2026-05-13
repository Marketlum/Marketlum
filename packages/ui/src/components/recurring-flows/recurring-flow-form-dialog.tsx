'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { CreateRecurringFlowInput, RecurringFlowResponse } from '@marketlum/shared';
import {
  RecurringFlowDirection,
  RecurringFlowFrequency,
  nextOccurrences,
} from '@marketlum/shared';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useAgents } from '../../hooks/use-agents';
import { useValueStreams } from '../../hooks/use-value-streams';
import { useValues } from '../../hooks/use-values';
import { ConversionPreview } from '../shared/conversion-preview';

interface RecurringFlowFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateRecurringFlowInput) => Promise<void>;
  flow?: RecurringFlowResponse | null;
  defaultValueStreamId?: string;
  isSubmitting?: boolean;
}

interface FormState {
  valueStreamId: string;
  counterpartyAgentId: string;
  valueId: string;
  direction: RecurringFlowDirection;
  amount: string;
  unit: string;
  frequency: RecurringFlowFrequency;
  interval: string;
  startDate: string;
  endDate: string;
  description: string;
}

function initialState(flow?: RecurringFlowResponse | null, defaultValueStreamId?: string): FormState {
  if (flow) {
    return {
      valueStreamId: flow.valueStream.id,
      counterpartyAgentId: flow.counterpartyAgent.id,
      valueId: flow.value?.id ?? '',
      direction: flow.direction,
      amount: flow.amount,
      unit: flow.unit,
      frequency: flow.frequency,
      interval: String(flow.interval),
      startDate: flow.startDate,
      endDate: flow.endDate ?? '',
      description: flow.description ?? '',
    };
  }
  const today = new Date().toISOString().slice(0, 10);
  return {
    valueStreamId: defaultValueStreamId ?? '',
    counterpartyAgentId: '',
    valueId: '',
    direction: RecurringFlowDirection.INBOUND,
    amount: '',
    unit: 'USD',
    frequency: RecurringFlowFrequency.MONTHLY,
    interval: '1',
    startDate: today,
    endDate: '',
    description: '',
  };
}

export function RecurringFlowFormDialog({
  open,
  onOpenChange,
  onSubmit,
  flow,
  defaultValueStreamId,
  isSubmitting,
}: RecurringFlowFormDialogProps) {
  const t = useTranslations('recurringFlows');
  const tc = useTranslations('common');
  const { agents } = useAgents();
  const { valueStreams } = useValueStreams();
  const { values } = useValues();
  const [form, setForm] = useState<FormState>(() => initialState(flow, defaultValueStreamId));

  useEffect(() => {
    setForm(initialState(flow, defaultValueStreamId));
  }, [flow, defaultValueStreamId, open]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const previewOccurrences = (() => {
    if (!form.startDate || !form.interval) return [];
    const interval = parseInt(form.interval, 10);
    if (!Number.isFinite(interval) || interval < 1) return [];
    try {
      return nextOccurrences(
        {
          frequency: form.frequency,
          interval,
          startDate: form.startDate,
          endDate: form.endDate || null,
        },
        3,
      );
    } catch {
      return [];
    }
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.valueStreamId || !form.counterpartyAgentId || !form.amount || !form.unit) {
      toast.error(tc('validationFailed'));
      return;
    }
    const interval = parseInt(form.interval, 10) || 1;
    const input: CreateRecurringFlowInput = {
      valueStreamId: form.valueStreamId,
      counterpartyAgentId: form.counterpartyAgentId,
      valueId: form.valueId || null,
      direction: form.direction,
      amount: form.amount,
      unit: form.unit.trim(),
      frequency: form.frequency,
      interval,
      startDate: form.startDate,
      endDate: form.endDate || null,
      description: form.description || undefined,
    };
    await onSubmit(input);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{flow ? t('editFlow') : t('createFlow')}</DialogTitle>
          <DialogDescription>{t('formDescription')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>{t('direction')}</Label>
            <Select value={form.direction} onValueChange={(v) => update('direction', v as RecurringFlowDirection)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={RecurringFlowDirection.INBOUND}>{t('directionInbound')}</SelectItem>
                <SelectItem value={RecurringFlowDirection.OUTBOUND}>{t('directionOutbound')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>{t('valueStream')}</Label>
            <Select
              value={form.valueStreamId}
              onValueChange={(v) => update('valueStreamId', v)}
              disabled={!!defaultValueStreamId}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectValueStream')} />
              </SelectTrigger>
              <SelectContent>
                {valueStreams.map((vs) => (
                  <SelectItem key={vs.id} value={vs.id}>{vs.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>{t('counterparty')}</Label>
            <Select value={form.counterpartyAgentId} onValueChange={(v) => update('counterpartyAgentId', v)}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectAgent')} />
              </SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>{t('value')}</Label>
            <Select value={form.valueId || 'none'} onValueChange={(v) => update('valueId', v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('noValue')}</SelectItem>
                {values.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t('amount')}</Label>
              <Input
                type="text"
                value={form.amount}
                onChange={(e) => update('amount', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <Label>{t('unit')}</Label>
              <Input
                type="text"
                value={form.unit}
                onChange={(e) => update('unit', e.target.value)}
                placeholder="USD"
                maxLength={32}
              />
            </div>
          </div>

          <ConversionPreview valueId={form.valueId || null} amount={form.amount} />

          <div className="space-y-1">
            <Label>{t('recurrence')}</Label>
            <div className="grid grid-cols-[5rem_1fr_1fr] gap-2 items-end">
              <Input
                type="number"
                min={1}
                value={form.interval}
                onChange={(e) => update('interval', e.target.value)}
              />
              <Select value={form.frequency} onValueChange={(v) => update('frequency', v as RecurringFlowFrequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={RecurringFlowFrequency.DAILY}>{t('frequencyDaily')}</SelectItem>
                  <SelectItem value={RecurringFlowFrequency.WEEKLY}>{t('frequencyWeekly')}</SelectItem>
                  <SelectItem value={RecurringFlowFrequency.MONTHLY}>{t('frequencyMonthly')}</SelectItem>
                  <SelectItem value={RecurringFlowFrequency.QUARTERLY}>{t('frequencyQuarterly')}</SelectItem>
                  <SelectItem value={RecurringFlowFrequency.YEARLY}>{t('frequencyYearly')}</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => update('startDate', e.target.value)}
              />
            </div>
            {previewOccurrences.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {t('nextOccurrencesLabel')}: {previewOccurrences.join(', ')}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>{t('endDate')}</Label>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => update('endDate', e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>{t('description')}</Label>
            <Textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tc('saving') : tc('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
