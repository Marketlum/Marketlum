'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ArrowLeft, Pencil, ShoppingCart, Trash2 } from 'lucide-react';
import type {
  CreateOrderInput,
  CreateOrderItemInput,
  OrderAddressInput,
} from '@marketlum/shared';
import { OrderState } from '@marketlum/shared';
import { api, ApiError } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import { ConfirmDeleteDialog } from '../../components/shared/confirm-delete-dialog';
import { OrderFormDialog } from '../../components/orders/order-form-dialog';
import { OrderAddressCard } from '../../components/orders/order-address-card';
import { OrderItemsEditor } from '../../components/orders/order-items-editor';
import { OrderInvoicesTab } from '../../components/orders/order-invoices-tab';
import { orderStateBadgeVariant } from '../../components/orders/columns';

interface OrderAddress {
  countryCode: string;
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string;
}

interface OrderDetail {
  id: string;
  number: string;
  state: OrderState;
  fromAgent: { id: string; name: string } | null;
  toAgent: { id: string; name: string } | null;
  currency: { id: string; name: string } | null;
  channel: { id: string; name: string } | null;
  pipeline: { id: string; name: string } | null;
  locale: { id: string; code: string } | null;
  shippingAddress: OrderAddress | null;
  billingAddress: OrderAddress | null;
  items: {
    id: string;
    value: { id: string; name: string } | null;
    valueInstance: { id: string; name: string } | null;
    quantity: string;
    unitPrice: string;
    total: string;
  }[];
  total: string;
  invoicedTotal: string | null;
  placedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

const TRANSITIONS: Partial<Record<OrderState, { action: string; labelKey: string }[]>> = {
  [OrderState.DRAFT]: [
    { action: 'place', labelKey: 'place' },
    { action: 'cancel', labelKey: 'cancel' },
  ],
  [OrderState.NEW]: [
    { action: 'start', labelKey: 'start' },
    { action: 'cancel', labelKey: 'cancel' },
  ],
  [OrderState.PROCESSING]: [
    { action: 'complete', labelKey: 'complete' },
    { action: 'cancel', labelKey: 'cancel' },
  ],
};

export function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations('orders');
  const tc = useTranslations('common');
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const result = await api.get<OrderDetail>(`/orders/${params.id}`);
      setOrder(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleTransition = async (action: string) => {
    if (!order) return;
    try {
      await api.post(`/orders/${order.id}/${action}`, {});
      toast.success(t('stateChanged'));
      fetchOrder();
    } catch {
      toast.error(t('failedToTransition'));
    }
  };

  const handleEdit = async (input: CreateOrderInput) => {
    if (!order) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/orders/${order.id}`, input);
      toast.success(t('updated'));
      setEditOpen(false);
      fetchOrder();
    } catch {
      toast.error(t('failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAddress = async (
    field: 'shippingAddress' | 'billingAddress',
    address: OrderAddressInput | null,
  ) => {
    if (!order) return;
    try {
      await api.patch(`/orders/${order.id}`, { [field]: address });
      toast.success(t('updated'));
      fetchOrder();
    } catch {
      toast.error(t('failedToUpdate'));
      throw new Error('save failed');
    }
  };

  const handleSaveItems = async (items: CreateOrderItemInput[]) => {
    if (!order) return;
    try {
      await api.patch(`/orders/${order.id}`, { items });
      toast.success(t('updated'));
      fetchOrder();
    } catch {
      toast.error(t('failedToUpdate'));
      throw new Error('save failed');
    }
  };

  const handleDelete = async () => {
    if (!order) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/orders/${order.id}`);
      toast.success(t('deleted'));
      router.push('/admin/orders');
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center text-muted-foreground">
        {tc('loading')}
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <h2 className="text-xl font-semibold">{t('notFound')}</h2>
        <p className="text-muted-foreground">{t('notFoundDescription')}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/orders">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToOrders')}
          </Link>
        </Button>
      </div>
    );
  }

  const stateLabels: Record<OrderState, string> = {
    [OrderState.DRAFT]: t('stateDraft'),
    [OrderState.NEW]: t('stateNew'),
    [OrderState.PROCESSING]: t('stateProcessing'),
    [OrderState.COMPLETED]: t('stateCompleted'),
    [OrderState.CANCELLED]: t('stateCancelled'),
  };

  const isDraft = order.state === OrderState.DRAFT;
  const deletable = isDraft || order.state === OrderState.CANCELLED;
  const linkable =
    order.state !== OrderState.COMPLETED && order.state !== OrderState.CANCELLED;
  const transitions = TRANSITIONS[order.state] ?? [];

  const detailRows: { label: string; value: React.ReactNode }[] = [
    { label: t('from'), value: order.fromAgent?.name ?? '—' },
    { label: t('to'), value: order.toAgent?.name ?? '—' },
    { label: t('currency'), value: order.currency?.name ?? '—' },
    { label: t('channel'), value: order.channel?.name ?? '—' },
    { label: t('pipeline'), value: order.pipeline?.name ?? '—' },
    { label: t('locale'), value: order.locale?.code ?? '—' },
    { label: t('total'), value: `${order.total} ${order.currency?.name ?? ''}` },
    {
      label: t('invoicedTotal'),
      value: order.invoicedTotal
        ? `${order.invoicedTotal} ${order.currency?.name ?? ''}`
        : '—',
    },
    {
      label: t('placedAt'),
      value: order.placedAt ? new Date(order.placedAt).toLocaleString() : '—',
    },
    {
      label: t('completedAt'),
      value: order.completedAt ? new Date(order.completedAt).toLocaleString() : '—',
    },
    {
      label: t('cancelledAt'),
      value: order.cancelledAt ? new Date(order.cancelledAt).toLocaleString() : '—',
    },
  ];

  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin">{tc('home')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/orders">{t('title')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{order.number}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-3">
            <h1 className="truncate text-2xl font-bold md:text-3xl">{order.number}</h1>
            <Badge variant={orderStateBadgeVariant(order.state)}>
              {stateLabels[order.state]}
            </Badge>
          </div>
          <p className="mb-2 text-muted-foreground">
            {order.fromAgent?.name ?? '—'} → {order.toAgent?.name ?? '—'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {transitions.map((transition) => (
              <Button
                key={transition.action}
                size="sm"
                variant={transition.action === 'cancel' ? 'outline' : 'default'}
                onClick={() => handleTransition(transition.action)}
              >
                {t(transition.labelKey)}
              </Button>
            ))}
            {isDraft && (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                {tc('edit')}
              </Button>
            )}
            {deletable && (
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                {tc('delete')}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList className="mb-4 flex w-full flex-wrap justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="details">{t('detailsTab')}</TabsTrigger>
          <TabsTrigger value="invoices">{t('invoicesTab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('detailsTab')}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                {detailRows.map((row) => (
                  <div key={row.label} className="flex justify-between gap-4 border-b py-1.5 text-sm sm:block sm:border-0">
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className="font-medium">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <OrderAddressCard
              title={t('shippingAddress')}
              address={order.shippingAddress}
              editable={isDraft}
              copyFromAgentId={order.toAgent?.id}
              onSave={(address) => handleSaveAddress('shippingAddress', address)}
            />
            <OrderAddressCard
              title={t('billingAddress')}
              address={order.billingAddress}
              editable={isDraft}
              copyFromAgentId={order.toAgent?.id}
              onSave={(address) => handleSaveAddress('billingAddress', address)}
            />
          </div>

          <OrderItemsEditor
            items={order.items}
            total={order.total}
            editable={isDraft}
            onSave={handleSaveItems}
          />
        </TabsContent>

        <TabsContent value="invoices">
          <OrderInvoicesTab
            orderId={order.id}
            orderCurrencyId={order.currency?.id ?? null}
            linkable={linkable}
            onChanged={fetchOrder}
          />
        </TabsContent>
      </Tabs>

      <OrderFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        order={order}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title={t('deleteOrder')}
        description={tc('confirmDeleteDescription', { name: order.number })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
