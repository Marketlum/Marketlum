'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { CreateOrderInput, LocaleResponse, PaginatedResponse } from '@marketlum/shared';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../ui/sheet';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ValueCombobox } from '../shared/value-combobox';
import { api } from '../../lib/api-client';
import { useActors } from '../../hooks/use-actors';
import { useValues } from '../../hooks/use-values';
import { useChannels } from '../../hooks/use-channels';
import { usePipelines } from '../../hooks/use-pipelines';

interface OrderHeaderData {
  fromActor: { id: string } | null;
  toActor: { id: string } | null;
  currency: { id: string } | null;
  channel: { id: string } | null;
  pipeline: { id: string } | null;
  locale: { id: string } | null;
}

interface OrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateOrderInput) => Promise<void>;
  isSubmitting?: boolean;
  /** Preselect one side of the order (used from the actor detail page). */
  defaultFromActorId?: string;
  /** When set, the dialog edits this order's header instead of creating. */
  order?: OrderHeaderData | null;
}

export function OrderFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  defaultFromActorId,
  order,
}: OrderFormDialogProps) {
  const t = useTranslations('orders');
  const tc = useTranslations('common');
  const { actors } = useActors(open);
  const { values } = useValues(open);
  const { channels } = useChannels(open);
  const { pipelines } = usePipelines(open);
  const [locales, setLocales] = useState<LocaleResponse[]>([]);
  const [fromActorId, setFromActorId] = useState('');
  const [toActorId, setToActorId] = useState('');
  const [currencyId, setCurrencyId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [pipelineId, setPipelineId] = useState('');
  const [localeId, setLocaleId] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setFromActorId(order?.fromActor?.id ?? defaultFromActorId ?? '');
      setToActorId(order?.toActor?.id ?? '');
      setCurrencyId(order?.currency?.id ?? '');
      setChannelId(order?.channel?.id ?? '');
      setPipelineId(order?.pipeline?.id ?? '');
      setLocaleId(order?.locale?.id ?? '');
      setSubmitted(false);
      api
        .get<PaginatedResponse<LocaleResponse>>('/locales?limit=10000')
        .then((result) => setLocales(result.data))
        .catch(() => {});
    }
  }, [open, defaultFromActorId, order]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!fromActorId || !toActorId || !currencyId) return;
    void onSubmit({
      fromActorId,
      toActorId,
      currencyId,
      channelId: channelId || null,
      pipelineId: pipelineId || null,
      localeId: localeId || null,
    });
  };

  const actorSelect = (
    label: string,
    value: string,
    onChange: (id: string) => void,
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={value || '__none__'}
        onValueChange={(v) => onChange(v === '__none__' ? '' : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder={t('selectActor')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">{t('selectActor')}</SelectItem>
          {actors.map((actor) => (
            <SelectItem key={actor.id} value={actor.id}>
              {actor.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {submitted && !value && (
        <p className="text-sm text-destructive">{t('required')}</p>
      )}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="text-left">
          <SheetTitle>{order ? t('editOrder') : t('createOrder')}</SheetTitle>
          <SheetDescription>{order ? t('editDescription') : t('createDescription')}</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {actorSelect(t('from'), fromActorId, setFromActorId)}
            {actorSelect(t('to'), toActorId, setToActorId)}
          </div>

          <div className="space-y-2">
            <Label>{t('currency')}</Label>
            <ValueCombobox
              values={values}
              value={currencyId || null}
              onSelect={(id) => setCurrencyId(id ?? '')}
              placeholder={t('selectCurrency')}
            />
            {submitted && !currencyId && (
              <p className="text-sm text-destructive">{t('required')}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('channel')}</Label>
              <Select
                value={channelId || '__none__'}
                onValueChange={(v) => setChannelId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">&mdash;</SelectItem>
                  {channels.map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>
                      {ch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('pipeline')}</Label>
              <Select
                value={pipelineId || '__none__'}
                onValueChange={(v) => setPipelineId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">&mdash;</SelectItem>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('locale')}</Label>
            <Select
              value={localeId || '__none__'}
              onValueChange={(v) => setLocaleId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">&mdash;</SelectItem>
                {locales.map((locale) => (
                  <SelectItem key={locale.id} value={locale.id}>
                    {locale.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tc('saving') : order ? tc('update') : tc('create')}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
