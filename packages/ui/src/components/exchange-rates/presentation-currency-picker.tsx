'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import type { SystemSettingsPresentationCurrencyResponse } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { ValueCombobox } from '../shared/value-combobox';
import { useValues } from '../../hooks/use-values';
import { usePermissions } from '../../permissions/permissions-context';

interface PresentationCurrencyPickerProps {
  onChange?: () => void;
}

export function PresentationCurrencyPicker({ onChange }: PresentationCurrencyPickerProps) {
  const t = useTranslations('exchangeRates');
  const { can } = usePermissions();
  const canWrite = can('system-settings', 'write');
  const { values } = useValues();
  const [setting, setSetting] = useState<SystemSettingsPresentationCurrencyResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    try {
      const result =
        await api.get<SystemSettingsPresentationCurrencyResponse>('/system-settings/presentation-currency');
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
    if (id === setting.presentationCurrencyId) return;
    setLoading(true);
    try {
      const result = await api.put<SystemSettingsPresentationCurrencyResponse>(
        '/system-settings/presentation-currency',
        { presentationCurrencyId: id },
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

  const locked = setting.snapshotsExist || !canWrite;

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{t('baseValueLabel')}:</span>
        <div className="min-w-[16rem]">
          <ValueCombobox
            values={values}
            value={setting.presentationCurrencyId}
            onSelect={(id) => {
              if (!locked && !loading) handleSelect(id);
            }}
            placeholder={t('selectBaseValue')}
            noneLabel={t('noBaseValue')}
            className={locked || loading ? 'pointer-events-none opacity-60' : ''}
          />
        </div>
      </div>
      {setting.snapshotsExist && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          {t('baseValueLocked')}
        </p>
      )}
    </div>
  );
}
