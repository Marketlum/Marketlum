'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Plus, X } from 'lucide-react';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  type CreateInvoiceInput,
} from '@marketlum/shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ValueCombobox } from '@/components/shared/value-combobox';
import { useAgents } from '@/hooks/use-agents';
import { useValues } from '@/hooks/use-values';
import { useValueStreams } from '@/hooks/use-value-streams';
import { useChannels } from '@/hooks/use-channels';

interface ItemRow {
  valueId: string;
  valueInstanceId: string;
  quantity: string;
  unitPrice: string;
  total: string;
}

interface InvoiceData {
  id: string;
  number: string;
  fromAgent: { id: string; name: string } | null;
  toAgent: { id: string; name: string } | null;
  issuedAt: string;
  dueAt: string;
  currency: { id: string; name: string } | null;
  paid: boolean;
  link: string | null;
  file: unknown;
  valueStream: { id: string; name: string } | null;
  channel: { id: string; name: string } | null;
  items: { id: string; value: { id: string; name: string } | null; valueInstance: { id: string; name: string } | null; quantity: string; unitPrice: string; total: string }[];
}

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateInvoiceInput) => Promise<void>;
  invoice?: InvoiceData | null;
  isSubmitting?: boolean;
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  onSubmit,
  invoice,
  isSubmitting,
}: InvoiceFormDialogProps) {
  const isEditing = !!invoice;
  const schema = isEditing ? updateInvoiceSchema : createInvoiceSchema;
  const t = useTranslations('invoices');
  const tc = useTranslations('common');
  const { agents } = useAgents(open);
  const { values } = useValues(open);
  const { valueStreams } = useValueStreams(open);
  const { channels } = useChannels(open);
  const [items, setItems] = useState<ItemRow[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue: setFormValue,
    watch,
    formState: { errors },
  } = useForm<CreateInvoiceInput>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      if (invoice) {
        reset({
          number: invoice.number,
          fromAgentId: invoice.fromAgent?.id ?? '',
          toAgentId: invoice.toAgent?.id ?? '',
          issuedAt: invoice.issuedAt ? invoice.issuedAt.slice(0, 16) : '',
          dueAt: invoice.dueAt ? invoice.dueAt.slice(0, 16) : '',
          currencyId: invoice.currency?.id ?? '',
          paid: invoice.paid,
          link: invoice.link ?? '',
          valueStreamId: invoice.valueStream?.id ?? null,
          channelId: invoice.channel?.id ?? null,
        });
        setItems(
          (invoice.items ?? []).map((item) => ({
            valueId: item.value?.id ?? '',
            valueInstanceId: item.valueInstance?.id ?? '',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        );
      } else {
        reset({
          number: '',
          fromAgentId: '',
          toAgentId: '',
          issuedAt: '',
          dueAt: '',
          currencyId: '',
          paid: false,
          link: '',
          valueStreamId: null,
          channelId: null,
        });
        setItems([]);
      }
    }
  }, [open, invoice, reset]);

  const addItem = () => {
    setItems((prev) => [...prev, { valueId: '', valueInstanceId: '', quantity: '', unitPrice: '', total: '' }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ItemRow, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleFormSubmit = (data: CreateInvoiceInput) => {
    const validItems = items
      .filter((item) => item.quantity && item.unitPrice && item.total)
      .map((item) => ({
        ...(item.valueId ? { valueId: item.valueId } : {}),
        ...(item.valueInstanceId ? { valueInstanceId: item.valueInstanceId } : {}),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      }));

    return onSubmit({
      ...data,
      ...(validItems.length > 0 ? { items: validItems } : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editInvoice') : t('createInvoice')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('editDescription') : t('createDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inv-number">{t('number')}</Label>
            <Input id="inv-number" {...register('number')} />
            {errors.number && <p className="text-sm text-destructive">{errors.number.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('from')}</Label>
              <Select
                value={watch('fromAgentId') || '__none__'}
                onValueChange={(v) => setFormValue('fromAgentId', v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectAgent')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('selectAgent')}</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('to')}</Label>
              <Select
                value={watch('toAgentId') || '__none__'}
                onValueChange={(v) => setFormValue('toAgentId', v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectAgent')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('selectAgent')}</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inv-issuedAt">{t('issuedAt')}</Label>
              <Input id="inv-issuedAt" type="datetime-local" {...register('issuedAt')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-dueAt">{t('dueAt')}</Label>
              <Input id="inv-dueAt" type="datetime-local" {...register('dueAt')} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('currency')}</Label>
              <ValueCombobox
                values={values}
                value={watch('currencyId') || null}
                onSelect={(id) => setFormValue('currencyId', id ?? '')}
                placeholder={t('selectCurrency')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('paid')}</Label>
              <Select
                value={watch('paid') ? 'true' : 'false'}
                onValueChange={(v) => setFormValue('paid', v === 'true')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">{t('paidNo')}</SelectItem>
                  <SelectItem value="true">{t('paidYes')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inv-link">{t('link')}</Label>
              <Input id="inv-link" {...register('link')} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>{t('valueStream')}</Label>
              <Select
                value={watch('valueStreamId') ?? '__none__'}
                onValueChange={(v) => setFormValue('valueStreamId', v === '__none__' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectValueStream')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">&mdash;</SelectItem>
                  {valueStreams.map((vs) => (
                    <SelectItem key={vs.id} value={vs.id}>
                      {vs.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('channel')}</Label>
            <Select
              value={watch('channelId') ?? '__none__'}
              onValueChange={(v) => setFormValue('channelId', v === '__none__' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectChannel')} />
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
            <div className="flex items-center justify-between">
              <Label>{t('items')}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1 h-3 w-3" />
                {t('addItem')}
              </Button>
            </div>
            {items.length > 0 && (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {t('items')} #{idx + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeItem(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">{t('value')}</Label>
                        <ValueCombobox
                          values={values}
                          value={item.valueId || null}
                          onSelect={(id) => updateItem(idx, 'valueId', id ?? '')}
                          placeholder={t('selectValue')}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">{t('quantity')}</Label>
                        <Input
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t('unitPrice')}</Label>
                        <Input
                          value={item.unitPrice}
                          onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t('total')}</Label>
                        <Input
                          value={item.total}
                          onChange={(e) => updateItem(idx, 'total', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tc('saving') : isEditing ? tc('update') : tc('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
