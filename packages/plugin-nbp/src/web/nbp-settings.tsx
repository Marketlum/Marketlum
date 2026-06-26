'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api, Button, Input, Label } from '@marketlum/ui';

interface NbpSettings {
  enabled: boolean;
  cron: string;
  trackedCurrencies: string[];
}

interface NbpSummary {
  effectiveDate: string | null;
  updated: string[];
  skipped: string[];
  errors: string[];
}

/** Custom settings UI for the NBP plugin: enable/cron/tracked currencies plus a
 * "Refresh now" trigger that surfaces the run summary. */
export function NbpSettings() {
  const t = useTranslations('plugin.nbp.settings');
  const [settings, setSettings] = useState<NbpSettings>({
    enabled: false,
    cron: '',
    trackedCurrencies: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<{ value: NbpSettings }>('/plugins/nbp/settings')
      .then((r) => {
        if (active) setSettings(r.value);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const r = await api.put<{ value: NbpSettings }>('/plugins/nbp/settings', settings);
      setSettings(r.value);
      setStatus(t('saved'));
    } catch {
      setStatus(t('failed'));
    } finally {
      setSaving(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    setStatus(null);
    try {
      const summary = await api.post<NbpSummary>('/plugins/nbp/refresh');
      setStatus(
        t('lastRun', {
          updated: summary.updated.length,
          skipped: summary.skipped.length,
          errors: summary.errors.length,
        }),
      );
    } catch {
      setStatus(t('failed'));
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          id="nbp-enabled"
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
        />
        <Label htmlFor="nbp-enabled">{t('enabled')}</Label>
      </div>
      <div className="space-y-1">
        <Label htmlFor="nbp-cron">{t('cron')}</Label>
        <Input
          id="nbp-cron"
          value={settings.cron}
          onChange={(e) => setSettings((s) => ({ ...s, cron: e.target.value }))}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="nbp-tracked">{t('tracked')}</Label>
        <Input
          id="nbp-tracked"
          value={settings.trackedCurrencies.join(', ')}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              trackedCurrencies: e.target.value
                .split(',')
                .map((x) => x.trim().toUpperCase())
                .filter(Boolean),
            }))
          }
        />
      </div>
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>
          {t('save')}
        </Button>
        <Button variant="outline" onClick={refresh} disabled={refreshing}>
          {t('refresh')}
        </Button>
      </div>
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
    </div>
  );
}
