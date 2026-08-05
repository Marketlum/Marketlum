'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus, UserPlus, X } from 'lucide-react';
import {
  ActorType,
  InvoiceMarket,
  ValueType,
  createInvoiceSchema,
  updateInvoiceSchema,
  type CreateInvoiceInput,
  type CreateActorInput,
  type ActorResponse,
} from '@marketlum/shared';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../ui/sheet';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { ValueCombobox } from '../shared/value-combobox';
import { ConversionPreview } from '../shared/conversion-preview';
import { ActorFormDialog } from '../actors/actor-form-dialog';
import { api } from '../../lib/api-client';
import { useActors } from '../../hooks/use-actors';
import { useValues } from '../../hooks/use-values';
import { useChannels } from '../../hooks/use-channels';

interface OrderOption {
  id: string;
  number: string;
}

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
  fromActor: { id: string; name: string } | null;
  toActor: { id: string; name: string } | null;
  issuedAt: string;
  dueAt: string;
  currency: { id: string; name: string } | null;
  market: InvoiceMarket;
  onBehalfOfActor?: { id: string; name: string } | null;
  paid: boolean;
  link: string | null;
  file: unknown;
  channel: { id: string; name: string } | null;
  order: { id: string; number: string } | null;
  items: { id: string; value: { id: string; name: string } | null; valueInstance: { id: string; name: string } | null; quantity: string; unitPrice: string; total: string }[];
}

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateInvoiceInput) => Promise<void>;
  invoice?: InvoiceData | null;
  /**
   * When set, opens the dialog in create-mode with fields seeded from an
   * /invoices/import response. Unmatched pickers (id=null) render the
   * extracted name as ghost text + an amber hint.
   */
  prefill?: import('@marketlum/shared').InvoiceImportResponse;
  isSubmitting?: boolean;
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  onSubmit,
  invoice,
  prefill,
  isSubmitting,
}: InvoiceFormDialogProps) {
  const isEditing = !!invoice;
  const schema = isEditing ? updateInvoiceSchema : createInvoiceSchema;
  const t = useTranslations('invoices');
  const tc = useTranslations('common');
  const ta = useTranslations('actors');
  const { actors, refresh: refreshActors } = useActors(open);
  const { values } = useValues(open);
  const currencyOptions = values.filter((v) => v.type === ValueType.CURRENCY);
  const { channels } = useChannels(open);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [virtualDescendants, setVirtualDescendants] = useState<ActorResponse[]>([]);

  useEffect(() => {
    if (open) {
      api
        .get<{ data: OrderOption[] }>('/orders/search?page=1&limit=10000')
        .then((result) => setOrders(result.data))
        .catch(() => {});
    }
  }, [open]);
  const [actorFormFor, setActorFormFor] = useState<
    'fromActorId' | 'toActorId' | null
  >(null);
  const [actorFormDefaultName, setActorFormDefaultName] = useState('');
  const [actorSubmitting, setActorSubmitting] = useState(false);

  const openActorForm = (
    field: 'fromActorId' | 'toActorId',
    defaultName = '',
  ) => {
    setActorFormDefaultName(defaultName);
    setActorFormFor(field);
  };

  const handleCreateActor = async (input: CreateActorInput) => {
    if (!actorFormFor) return;
    setActorSubmitting(true);
    try {
      const created = await api.post<ActorResponse>('/actors', input);
      toast.success(ta('created'));
      await refreshActors();
      setFormValue(actorFormFor, created.id);
      setActorFormFor(null);
    } catch {
      toast.error(ta('failedToCreate'));
    } finally {
      setActorSubmitting(false);
    }
  };

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

  const watchedFromActorId = watch('fromActorId');
  const watchedMarket = watch('market');
  const isExternal = (watchedMarket ?? InvoiceMarket.EXTERNAL) === InvoiceMarket.EXTERNAL;

  // On-behalf-of (spec 022) is only offered on external invoices whose
  // issuer has virtual (non-legal-entity) descendants.
  useEffect(() => {
    if (open && watchedFromActorId && isExternal) {
      api
        .get<ActorResponse[]>(`/actors/${watchedFromActorId}/descendants`)
        .then((list) =>
          setVirtualDescendants(list.filter((a) => a.type === ActorType.VIRTUAL)),
        )
        .catch(() => setVirtualDescendants([]));
    } else {
      setVirtualDescendants([]);
    }
  }, [open, watchedFromActorId, isExternal]);

  useEffect(() => {
    if (open) {
      if (invoice) {
        reset({
          number: invoice.number,
          fromActorId: invoice.fromActor?.id ?? '',
          toActorId: invoice.toActor?.id ?? '',
          issuedAt: invoice.issuedAt ? invoice.issuedAt.slice(0, 10) : '',
          dueAt: invoice.dueAt ? invoice.dueAt.slice(0, 10) : '',
          currencyId: invoice.currency?.id ?? '',
          market: invoice.market,
          onBehalfOfActorId: invoice.onBehalfOfActor?.id ?? null,
          paid: invoice.paid,
          link: invoice.link ?? '',
          channelId: invoice.channel?.id ?? null,
          orderId: invoice.order?.id ?? null,
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
      } else if (prefill) {
        reset({
          number: prefill.extracted.number ?? '',
          fromActorId: prefill.extracted.fromActor.id ?? '',
          toActorId: prefill.extracted.toActor.id ?? '',
          issuedAt: prefill.extracted.issuedAt ?? '',
          dueAt: prefill.extracted.dueAt ?? '',
          currencyId: prefill.extracted.currency.id ?? '',
          market: InvoiceMarket.EXTERNAL,
          onBehalfOfActorId: null,
          paid: false,
          link: '',
          fileId: prefill.fileId,
          channelId: null,
          orderId: null,
        });
        setItems(
          prefill.extracted.items.map((item) => ({
            valueId: item.value?.id ?? '',
            valueInstanceId: '',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        );
      } else {
        reset({
          number: '',
          fromActorId: '',
          toActorId: '',
          issuedAt: '',
          dueAt: '',
          currencyId: '',
          market: InvoiceMarket.EXTERNAL,
          onBehalfOfActorId: null,
          paid: false,
          link: '',
          channelId: null,
          orderId: null,
        });
        setItems([]);
      }
    }
  }, [open, invoice, prefill, reset]);

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
      // Keep the total in sync with quantity × unit price; it stays
      // directly editable for rounding overrides.
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = Number(next[index].quantity);
        const unitPrice = Number(next[index].unitPrice);
        if (Number.isFinite(qty) && Number.isFinite(unitPrice) && next[index].quantity && next[index].unitPrice) {
          next[index].total = (qty * unitPrice).toFixed(2);
        }
      }
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
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-2xl"
      >
        <SheetHeader className="text-left">
          <SheetTitle>{isEditing ? t('editInvoice') : t('createInvoice')}</SheetTitle>
          <SheetDescription>
            {isEditing ? t('editDescription') : t('createDescription')}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="mt-4 space-y-4">
          {prefill && prefill.warnings.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950">
              <p className="font-medium mb-1">{t('importWarningsTitle')}</p>
              <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                {prefill.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('market')}</Label>
            <Tabs
              value={watchedMarket ?? InvoiceMarket.EXTERNAL}
              onValueChange={(v) => {
                setFormValue('market', v as InvoiceMarket);
                if (v !== InvoiceMarket.EXTERNAL) {
                  setFormValue('onBehalfOfActorId', null);
                }
              }}
            >
              <TabsList>
                <TabsTrigger value={InvoiceMarket.EXTERNAL}>
                  {t('marketExternal')}
                </TabsTrigger>
                <TabsTrigger value={InvoiceMarket.INTERNAL}>
                  {t('marketInternal')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inv-number">
              {t('number')} <span className="text-destructive">*</span>
            </Label>
            <Input id="inv-number" {...register('number')} />
            {errors.number && <p className="text-sm text-destructive">{errors.number.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                {t('from')} <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Select
                  value={watch('fromActorId') || '__none__'}
                  onValueChange={(v) => {
                    setFormValue('fromActorId', v === '__none__' ? '' : v);
                    setFormValue('onBehalfOfActorId', null);
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue
                      placeholder={
                        prefill && !prefill.extracted.fromActor.id
                          ? prefill.extracted.fromActor.name
                          : t('selectActor')
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('selectActor')}</SelectItem>
                    {actors.map((actor) => {
                      const illegalIssuer =
                        isExternal && actor.type === ActorType.VIRTUAL;
                      return (
                        <SelectItem
                          key={actor.id}
                          value={actor.id}
                          disabled={illegalIssuer}
                        >
                          {actor.name}
                          {illegalIssuer && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({t('notLegalEntityHint')})
                            </span>
                          )}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title={ta('createActor')}
                  onClick={() => openActorForm('fromActorId')}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
              {prefill && !prefill.extracted.fromActor.id && !watch('fromActorId') && (
                <button
                  type="button"
                  className="text-xs text-amber-600 hover:underline text-left"
                  onClick={() =>
                    openActorForm('fromActorId', prefill.extracted.fromActor.name)
                  }
                >
                  {t('importCreateActorHint', { name: prefill.extracted.fromActor.name })}
                </button>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                {t('to')} <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Select
                  value={watch('toActorId') || '__none__'}
                  onValueChange={(v) => setFormValue('toActorId', v === '__none__' ? '' : v)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue
                      placeholder={
                        prefill && !prefill.extracted.toActor.id
                          ? prefill.extracted.toActor.name
                          : t('selectActor')
                      }
                    />
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
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title={ta('createActor')}
                  onClick={() => openActorForm('toActorId')}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
              {prefill && !prefill.extracted.toActor.id && !watch('toActorId') && (
                <button
                  type="button"
                  className="text-xs text-amber-600 hover:underline text-left"
                  onClick={() =>
                    openActorForm('toActorId', prefill.extracted.toActor.name)
                  }
                >
                  {t('importCreateActorHint', { name: prefill.extracted.toActor.name })}
                </button>
              )}
            </div>
          </div>

          {isExternal && virtualDescendants.length > 0 && (
            <div className="space-y-2">
              <Label>{t('onBehalfOf')}</Label>
              <Select
                value={watch('onBehalfOfActorId') ?? '__none__'}
                onValueChange={(v) =>
                  setFormValue('onBehalfOfActorId', v === '__none__' ? null : v)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('onBehalfOfNone')}</SelectItem>
                  {virtualDescendants.map((actor) => (
                    <SelectItem key={actor.id} value={actor.id}>
                      {actor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {watch('onBehalfOfActorId') && (
                <p className="text-xs text-muted-foreground">{t('onBehalfOfHint')}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inv-issuedAt">
                {t('issuedAt')} <span className="text-destructive">*</span>
              </Label>
              <Input id="inv-issuedAt" type="date" {...register('issuedAt')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-dueAt">
                {t('dueAt')} <span className="text-destructive">*</span>
              </Label>
              <Input id="inv-dueAt" type="date" {...register('dueAt')} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                {t('currency')} <span className="text-destructive">*</span>
              </Label>
              <ValueCombobox
                values={currencyOptions}
                value={watch('currencyId') || null}
                onSelect={(id) => setFormValue('currencyId', id ?? '')}
                placeholder={
                  prefill && !prefill.extracted.currency.id
                    ? prefill.extracted.currency.name
                    : t('selectCurrency')
                }
              />
              {prefill && !prefill.extracted.currency.id && !watch('currencyId') && (
                <p className="text-xs text-amber-600">
                  {t('importUnmatchedHint', { name: prefill.extracted.currency.name })}
                </p>
              )}
              <ConversionPreview
                valueId={watch('currencyId') || null}
                amount={items
                  .reduce((sum, it) => sum + (Number(it.total) || 0), 0)
                  .toFixed(2)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-paid">{t('paid')}</Label>
              <label
                htmlFor="inv-paid"
                className="flex h-9 cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  id="inv-paid"
                  type="checkbox"
                  checked={!!watch('paid')}
                  onChange={(e) => setFormValue('paid', e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <span>{watch('paid') ? t('paidBadge') : t('unpaidBadge')}</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inv-link">{t('link')}</Label>
              <Input id="inv-link" {...register('link')} placeholder="https://..." />
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
              <Label>{t('order')}</Label>
              <Select
                value={watch('orderId') ?? '__none__'}
                onValueChange={(v) => setFormValue('orderId', v === '__none__' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectOrder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">&mdash;</SelectItem>
                  {orders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tc('saving') : isEditing ? tc('update') : tc('create')}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
    <ActorFormDialog
      open={actorFormFor !== null}
      onOpenChange={(o) => {
        if (!o) setActorFormFor(null);
      }}
      onSubmit={handleCreateActor}
      defaultName={actorFormDefaultName}
      isSubmitting={actorSubmitting}
    />
    </>
  );
}
