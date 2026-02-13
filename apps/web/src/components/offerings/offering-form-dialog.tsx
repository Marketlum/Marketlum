'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Plus, X } from 'lucide-react';
import {
  createOfferingSchema,
  updateOfferingSchema,
  OfferingState,
  type CreateOfferingInput,
  type OfferingResponse,
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ValueCombobox } from '@/components/shared/value-combobox';
import { useAgents } from '@/hooks/use-agents';
import { useValueStreams } from '@/hooks/use-value-streams';
import { useValues } from '@/hooks/use-values';

interface ComponentRow {
  valueId: string;
  quantity: string;
  pricingFormula: string;
  pricingLink: string;
}

interface OfferingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateOfferingInput) => Promise<void>;
  offering?: OfferingResponse | null;
  isSubmitting?: boolean;
}

export function OfferingFormDialog({
  open,
  onOpenChange,
  onSubmit,
  offering,
  isSubmitting,
}: OfferingFormDialogProps) {
  const isEditing = !!offering;
  const schema = isEditing ? updateOfferingSchema : createOfferingSchema;
  const t = useTranslations('offerings');
  const tc = useTranslations('common');
  const { agents } = useAgents(open);
  const { valueStreams } = useValueStreams(open);
  const { values } = useValues(open);
  const [components, setComponents] = useState<ComponentRow[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue: setFormValue,
    watch,
    formState: { errors },
  } = useForm<CreateOfferingInput>({
    resolver: zodResolver(schema),
  });

  const stateValue = watch('state');

  useEffect(() => {
    if (open) {
      if (offering) {
        reset({
          name: offering.name,
          purpose: offering.purpose ?? '',
          description: offering.description ?? '',
          link: offering.link ?? '',
          state: offering.state,
          activeFrom: offering.activeFrom ?? '',
          activeUntil: offering.activeUntil ?? '',
          valueStreamId: offering.valueStream?.id ?? null,
          agentId: offering.agent?.id ?? null,
        });
        setComponents(
          (offering.components ?? []).map((c) => ({
            valueId: c.value.id,
            quantity: c.quantity,
            pricingFormula: c.pricingFormula ?? '',
            pricingLink: c.pricingLink ?? '',
          })),
        );
      } else {
        reset({
          name: '',
          purpose: '',
          description: '',
          link: '',
          state: OfferingState.DRAFT,
          activeFrom: '',
          activeUntil: '',
          valueStreamId: null,
          agentId: null,
        });
        setComponents([]);
      }
    }
  }, [open, offering, reset]);

  const addComponent = () => {
    setComponents((prev) => [...prev, { valueId: '', quantity: '', pricingFormula: '', pricingLink: '' }]);
  };

  const removeComponent = (index: number) => {
    setComponents((prev) => prev.filter((_, i) => i !== index));
  };

  const updateComponent = (index: number, field: keyof ComponentRow, value: string) => {
    setComponents((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleFormSubmit = (data: CreateOfferingInput) => {
    const validComponents = components
      .filter((c) => c.valueId && c.quantity)
      .map((c) => ({
        valueId: c.valueId,
        quantity: c.quantity,
        ...(c.pricingFormula ? { pricingFormula: c.pricingFormula } : {}),
        ...(c.pricingLink ? { pricingLink: c.pricingLink } : {}),
      }));

    return onSubmit({
      ...data,
      ...(validComponents.length > 0 ? { components: validComponents } : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editOffering') : t('createOffering')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('editDescription') : t('createDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="off-name">{tc('name')}</Label>
            <Input id="off-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="off-purpose">{t('purpose')}</Label>
            <Textarea id="off-purpose" {...register('purpose')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="off-description">{t('offeringDescription')}</Label>
            <Textarea id="off-description" {...register('description')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="off-link">{t('link')}</Label>
            <Input id="off-link" {...register('link')} placeholder="https://..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('state')}</Label>
              <Select
                value={stateValue ?? 'draft'}
                onValueChange={(v) => setFormValue('state', v as OfferingState)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t('stateDraft')}</SelectItem>
                  <SelectItem value="live">{t('stateLive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('agent')}</Label>
              <Select
                value={watch('agentId') ?? '__none__'}
                onValueChange={(v) => setFormValue('agentId', v === '__none__' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectAgent')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">&mdash;</SelectItem>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="off-activeFrom">{t('activeFrom')}</Label>
              <Input id="off-activeFrom" type="datetime-local" {...register('activeFrom')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="off-activeUntil">{t('activeUntil')}</Label>
              <Input id="off-activeUntil" type="datetime-local" {...register('activeUntil')} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('components')}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addComponent}>
                <Plus className="mr-1 h-3 w-3" />
                {t('addComponent')}
              </Button>
            </div>
            {components.length > 0 && (
              <div className="space-y-3">
                {components.map((comp, idx) => (
                  <div key={idx} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {t('components')} #{idx + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeComponent(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">{t('value')}</Label>
                        <ValueCombobox
                          values={values}
                          value={comp.valueId || null}
                          onSelect={(id) => updateComponent(idx, 'valueId', id ?? '')}
                          placeholder={t('selectValue')}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t('quantity')}</Label>
                        <Input
                          value={comp.quantity}
                          onChange={(e) => updateComponent(idx, 'quantity', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">{t('pricingFormula')}</Label>
                        <Input
                          value={comp.pricingFormula}
                          onChange={(e) => updateComponent(idx, 'pricingFormula', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t('pricingLink')}</Label>
                        <Input
                          value={comp.pricingLink}
                          onChange={(e) => updateComponent(idx, 'pricingLink', e.target.value)}
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
