'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type {
  CreateExchangeRateInput,
  ExchangeRateResponse,
} from '@marketlum/shared';
import { invertRate } from '@marketlum/shared';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ValueCombobox } from '../shared/value-combobox';
import { useValues } from '../../hooks/use-values';

interface ExchangeRateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateExchangeRateInput) => Promise<void>;
  rate?: ExchangeRateResponse | null;
  isSubmitting?: boolean;
}

interface FormState {
  fromValueId: string;
  toValueId: string;
  rate: string;
  effectiveAt: string;
  source: string;
}

function nowLocalIso(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function initialState(rate?: ExchangeRateResponse | null): FormState {
  if (rate) {
    const d = new Date(rate.effectiveAt);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return {
      fromValueId: rate.fromValue.id,
      toValueId: rate.toValue.id,
      rate: rate.rate,
      effectiveAt: d.toISOString().slice(0, 16),
      source: rate.source ?? '',
    };
  }
  return {
    fromValueId: '',
    toValueId: '',
    rate: '',
    effectiveAt: nowLocalIso(),
    source: '',
  };
}

export function ExchangeRateFormDialog({
  open,
  onOpenChange,
  onSubmit,
  rate,
  isSubmitting,
}: ExchangeRateFormDialogProps) {
  const t = useTranslations('exchangeRates');
  const tc = useTranslations('common');
  const { values } = useValues();
  const [form, setForm] = useState<FormState>(() => initialState(rate));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initialState(rate));
    setError(null);
  }, [rate, open]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const samePair =
    form.fromValueId !== '' &&
    form.toValueId !== '' &&
    form.fromValueId === form.toValueId;

  const rateNum = Number(form.rate);
  const rateValid = form.rate !== '' && Number.isFinite(rateNum) && rateNum > 0;

  const inverse = rateValid ? invertRate(form.rate) : null;

  const canSubmit =
    !!form.fromValueId &&
    !!form.toValueId &&
    !samePair &&
    rateValid &&
    !!form.effectiveAt &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await onSubmit({
        fromValueId: form.fromValueId,
        toValueId: form.toValueId,
        rate: form.rate,
        effectiveAt: new Date(form.effectiveAt).toISOString(),
        source: form.source.trim() === '' ? null : form.source.trim(),
      });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rate ? t('editRate') : t('createRate')}</DialogTitle>
          <DialogDescription>{t('formDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label>{t('fromValue')}</Label>
            <ValueCombobox
              values={values}
              value={form.fromValueId || null}
              onSelect={(id) => update('fromValueId', id ?? '')}
              placeholder={t('selectValue')}
              excludeId={form.toValueId || undefined}
            />
          </div>

          <div className="grid gap-2">
            <Label>{t('toValue')}</Label>
            <ValueCombobox
              values={values}
              value={form.toValueId || null}
              onSelect={(id) => update('toValueId', id ?? '')}
              placeholder={t('selectValue')}
              excludeId={form.fromValueId || undefined}
            />
            {samePair && (
              <p className="text-xs text-destructive">{t('samePairError')}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rate-input">{t('rate')}</Label>
            <Input
              id="rate-input"
              type="number"
              step="any"
              min="0"
              value={form.rate}
              onChange={(e) => update('rate', e.target.value)}
              placeholder="1.0869"
            />
            {!rateValid && form.rate !== '' && (
              <p className="text-xs text-destructive">{t('ratePositiveError')}</p>
            )}
            {inverse && (
              <p className="text-xs text-muted-foreground">
                {t('inverseLabel', { inverse })}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="effective-at-input">{t('effectiveAt')}</Label>
            <Input
              id="effective-at-input"
              type="datetime-local"
              value={form.effectiveAt}
              onChange={(e) => update('effectiveAt', e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="source-input">{t('source')}</Label>
            <Input
              id="source-input"
              value={form.source}
              onChange={(e) => update('source', e.target.value)}
              placeholder={t('sourcePlaceholder')}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? tc('saving') : rate ? tc('update') : tc('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
