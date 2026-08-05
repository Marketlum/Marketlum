'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Trash2, ArrowRight, ArrowLeftRight } from 'lucide-react';
import { api } from '../../lib/api-client';
import { useActors } from '../../hooks/use-actors';
import { useValues } from '../../hooks/use-values';
import { useValueInstances } from '../../hooks/use-value-instances';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../ui/dialog';
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
import { ValueCombobox } from '../shared/value-combobox';
import { ConfirmDeleteDialog } from '../shared/confirm-delete-dialog';
import { Can } from '../../permissions/can';

interface FlowRow {
  id: string;
  value: { id: string; name: string } | null;
  valueInstance: { id: string; name: string } | null;
  fromActor: { id: string; name: string };
  toActor: { id: string; name: string };
  quantity: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PartyActor {
  id: string;
  name: string;
}

interface ExchangeFlowsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exchangeId: string;
  exchangeName: string;
  partyActors: PartyActor[];
}

export function ExchangeFlowsPanel({
  open,
  onOpenChange,
  exchangeId,
  exchangeName,
  partyActors,
}: ExchangeFlowsPanelProps) {
  const t = useTranslations('exchanges');
  const tc = useTranslations('common');
  const { actors } = useActors(open);
  const { values } = useValues(open);
  const { valueInstances } = useValueInstances(open);
  const [flows, setFlows] = useState<FlowRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<FlowRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FlowRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [valueId, setValueId] = useState<string>('none');
  const [valueInstanceId, setValueInstanceId] = useState<string>('none');
  const [fromActorId, setFromActorId] = useState<string>('');
  const [toActorId, setToActorId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const fetchFlows = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<FlowRow[]>(`/exchanges/${exchangeId}/flows`);
      setFlows(result);
    } catch {
      toast.error(t('failedToLoadFlows'));
    } finally {
      setLoading(false);
    }
  }, [exchangeId, t]);

  useEffect(() => {
    if (open && exchangeId) {
      fetchFlows();
    }
  }, [open, exchangeId, fetchFlows]);

  const resetForm = () => {
    setValueId('none');
    setValueInstanceId('none');
    setFromActorId(partyActors[0]?.id ?? '');
    setToActorId(partyActors[1]?.id ?? '');
    setQuantity('');
    setDescription('');
  };

  const openCreateForm = () => {
    setEditingFlow(null);
    resetForm();
    setFormOpen(true);
  };

  const swapActors = () => {
    setFromActorId(toActorId);
    setToActorId(fromActorId);
  };

  const openEditForm = (flow: FlowRow) => {
    setEditingFlow(flow);
    setValueId(flow.value?.id ?? 'none');
    setValueInstanceId(flow.valueInstance?.id ?? 'none');
    setFromActorId(flow.fromActor.id);
    setToActorId(flow.toActor.id);
    setQuantity(flow.quantity);
    setDescription(flow.description ?? '');
    setFormOpen(true);
  };

  const handleSubmitFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        fromActorId,
        toActorId,
        quantity,
        description: description.trim() ? description : null,
      };
      if (valueId !== 'none') {
        body.valueId = valueId;
        body.valueInstanceId = null;
      } else if (valueInstanceId !== 'none') {
        body.valueInstanceId = valueInstanceId;
        body.valueId = null;
      }

      if (editingFlow) {
        await api.patch(`/exchanges/${exchangeId}/flows/${editingFlow.id}`, body);
        toast.success(t('flowUpdated'));
      } else {
        await api.post(`/exchanges/${exchangeId}/flows`, body);
        toast.success(t('flowCreated'));
      }
      setFormOpen(false);
      setEditingFlow(null);
      fetchFlows();
    } catch {
      toast.error(editingFlow ? t('failedToUpdateFlow') : t('failedToCreateFlow'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFlow = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/exchanges/${exchangeId}/flows/${deleteTarget.id}`);
      toast.success(t('flowDeleted'));
      setDeleteTarget(null);
      fetchFlows();
    } catch {
      toast.error(t('failedToDeleteFlow'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter actors to only party actors for the selects
  const availableActors = partyActors.length > 0 ? partyActors : actors;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('flows')} — {exchangeName}</DialogTitle>
            <DialogDescription>{t('manageFlows')}</DialogDescription>
          </DialogHeader>

          <Can resource="exchanges" action="write">
            <div className="flex justify-end mb-2">
              <Button size="sm" onClick={openCreateForm}>
                <Plus className="mr-1 h-3 w-3" /> {t('addFlow')}
              </Button>
            </div>
          </Can>

          {loading ? (
            <div className="flex h-24 items-center justify-center text-muted-foreground">
              {tc('loading')}
            </div>
          ) : flows.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-muted-foreground">
              {t('noFlows')}
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left font-medium">{t('flowValue')}</th>
                    <th className="p-2 text-left font-medium">{t('fromActor')}</th>
                    <th className="p-2 text-center font-medium"></th>
                    <th className="p-2 text-left font-medium">{t('toActor')}</th>
                    <th className="p-2 text-right font-medium">{t('quantity')}</th>
                    <th className="p-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {flows.map((flow) => (
                    <tr key={flow.id} className="border-b last:border-0">
                      <td className="p-2">
                        <div>{flow.value?.name ?? flow.valueInstance?.name ?? '\u2014'}</div>
                        {flow.description && (
                          <div className="text-xs text-muted-foreground mt-0.5">{flow.description}</div>
                        )}
                      </td>
                      <td className="p-2">{flow.fromActor.name}</td>
                      <td className="p-2 text-center text-muted-foreground">
                        <ArrowRight className="h-3 w-3 inline" />
                      </td>
                      <td className="p-2">{flow.toActor.name}</td>
                      <td className="p-2 text-right font-mono">{flow.quantity}</td>
                      <td className="p-2 text-right">
                        <Can resource="exchanges" action="write">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditForm(flow)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(flow)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </Can>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Flow create/edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFlow ? t('editFlow') : t('addFlow')}</DialogTitle>
            <DialogDescription>
              {editingFlow ? t('editDescription') : t('createDescription')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitFlow} className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label>{t('flowValue')}</Label>
                <ValueCombobox
                  values={values}
                  value={valueId === 'none' ? null : valueId}
                  onSelect={(id) => {
                    setValueId(id ?? 'none');
                    if (id) setValueInstanceId('none');
                  }}
                  placeholder={t('selectValue')}
                  noneLabel={'\u2014'}
                />
              </div>
              <span className="pb-2 text-sm text-muted-foreground">{tc('or')}</span>
              <div className="flex-1 space-y-1">
                <Label>{t('flowValueInstance')}</Label>
                <Select
                  value={valueInstanceId}
                  onValueChange={(v) => {
                    setValueInstanceId(v);
                    if (v !== 'none') setValueId('none');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectValueInstance')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">&mdash;</SelectItem>
                    {valueInstances.map((vi) => (
                      <SelectItem key={vi.id} value={vi.id}>{vi.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label>{t('fromActor')}</Label>
                <Select value={fromActorId} onValueChange={setFromActorId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectActor')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableActors.map((actor) => (
                      <SelectItem key={actor.id} value={actor.id}>{actor.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={swapActors}
                disabled={!fromActorId && !toActorId}
                aria-label={t('swapActors')}
                title={t('swapActors')}
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
              <div className="flex-1 space-y-1">
                <Label>{t('toActor')}</Label>
                <Select value={toActorId} onValueChange={setToActorId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectActor')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableActors.map((actor) => (
                      <SelectItem key={actor.id} value={actor.id}>{actor.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>{t('quantity')}</Label>
              <Input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-1">
              <Label>{t('flowDescriptionLabel')}</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('flowDescriptionPlaceholder')}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? tc('saving') : editingFlow ? tc('update') : tc('create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDeleteFlow}
        title={t('deleteFlow')}
        description={tc('confirmDeleteDescription', { name: deleteTarget?.value?.name ?? deleteTarget?.valueInstance?.name ?? '' })}
        isDeleting={isSubmitting}
      />
    </>
  );
}
