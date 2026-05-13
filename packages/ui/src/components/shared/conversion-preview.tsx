'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type {
  ExchangeRateLookupResponse,
  SystemSettingsBaseValueResponse,
} from '@marketlum/shared';
import { convertAmount } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { useDebounce } from '../../hooks/use-debounce';

interface ConversionPreviewProps {
  valueId: string | null | undefined;
  amount: string;
}

interface PreviewState {
  loading: boolean;
  base: SystemSettingsBaseValueResponse | null;
  rate: ExchangeRateLookupResponse | null;
  rateMissing: boolean;
}

export function ConversionPreview({ valueId, amount }: ConversionPreviewProps) {
  const t = useTranslations('exchangeRates');
  const [state, setState] = useState<PreviewState>({
    loading: false,
    base: null,
    rate: null,
    rateMissing: false,
  });
  const debouncedValueId = useDebounce(valueId ?? '', 250);
  const debouncedAmount = useDebounce(amount, 250);

  useEffect(() => {
    let cancelled = false;
    if (!debouncedValueId) {
      setState({ loading: false, base: null, rate: null, rateMissing: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    (async () => {
      try {
        const base = await api.get<SystemSettingsBaseValueResponse>(
          '/system-settings/base-value',
        );
        if (cancelled) return;
        if (!base.baseValueId) {
          setState({ loading: false, base, rate: null, rateMissing: false });
          return;
        }
        if (base.baseValueId === debouncedValueId) {
          // Native value is the base — show identity conversion
          setState({
            loading: false,
            base,
            rate: {
              rate: '1.0000000000',
              sourceRowId: '',
              effectiveAt: new Date().toISOString(),
              fromValueId: debouncedValueId,
              toValueId: base.baseValueId,
            },
            rateMissing: false,
          });
          return;
        }
        const rate = await api.get<ExchangeRateLookupResponse | null>(
          `/exchange-rates/lookup?fromValueId=${debouncedValueId}&toValueId=${base.baseValueId}&at=${encodeURIComponent(new Date().toISOString())}`,
        );
        if (cancelled) return;
        setState({
          loading: false,
          base,
          rate,
          rateMissing: rate === null,
        });
      } catch {
        if (!cancelled) {
          setState({ loading: false, base: null, rate: null, rateMissing: false });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedValueId]);

  if (!valueId) return null;
  if (state.loading) return null;
  if (!state.base || !state.base.baseValueId) return null;

  if (state.rateMissing) {
    return (
      <p className="text-xs text-amber-600">! {t('noRateForPair')}</p>
    );
  }

  if (!state.rate) return null;

  const amountNum = Number(debouncedAmount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) return null;
  const baseAmount = convertAmount(debouncedAmount, state.rate.rate);
  const baseName = state.base.baseValue?.name ?? '';
  const effectiveAt = state.rate.effectiveAt.slice(0, 10);

  return (
    <p className="text-xs text-muted-foreground">
      ≈ {baseAmount} {baseName} {t('previewSuffix', { rate: state.rate.rate, date: effectiveAt })}
    </p>
  );
}
