'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import type { SystemSettingsBaseValueResponse } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { ValueCombobox } from '../shared/value-combobox';
import { useValues } from '../../hooks/use-values';

interface BaseValuePickerProps {
  onChange?: () => void;
}

export function BaseValuePicker({ onChange }: BaseValuePickerProps) {
  const t = useTranslations('exchangeRates');
  const { values } = useValues();
  const [setting, setSetting] = useState<SystemSettingsBaseValueResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    try {
      const result =
        await api.get<SystemSettingsBaseValueResponse>('/system-settings/base-value');
      setSetting(result);
    } catch {
      // Silent — caller may still see no base
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSelect = async (id: string | null) => {
    if (!setting) return;
    if (id === setting.baseValueId) return;
    setLoading(true);
    try {
      const result = await api.put<SystemSettingsBaseValueResponse>(
        '/system-settings/base-value',
        { baseValueId: id },
      );
      setSetting(result);
      toast.success(t('baseValueUpdated'));
      onChange?.();
    } catch (err) {
      const message = (err as Error).message || t('baseValueUpdateFailed');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!setting) return null;

  const locked = setting.snapshotsExist;

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{t('baseValueLabel')}:</span>
        <div className="min-w-[16rem]">
          <ValueCombobox
            values={values}
            value={setting.baseValueId}
            onSelect={(id) => {
              if (!locked && !loading) handleSelect(id);
            }}
            placeholder={t('selectBaseValue')}
            noneLabel={t('noBaseValue')}
            className={locked || loading ? 'pointer-events-none opacity-60' : ''}
          />
        </div>
      </div>
      {locked && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          {t('baseValueLocked')}
        </p>
      )}
    </div>
  );
}
