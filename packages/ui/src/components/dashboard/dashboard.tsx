'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type {
  DashboardSummaryResponse,
  SystemSettingsPresentationCurrencyResponse,
} from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { useAgents } from '../../hooks/use-agents';
import { useChannels } from '../../hooks/use-channels';
import { RevenueExpensesChart } from './revenue-expenses-chart';
import { formatDate, getPresetRange } from '../../lib/date-range-presets';
import { formatMoney } from '../../lib/format';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export function Dashboard() {
  const t = useTranslations('dashboard');
  const { agents } = useAgents();
  const { channels } = useChannels();

  const [agentId, setAgentId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [preset, setPreset] = useState('all');

  const [data, setData] = useState<DashboardSummaryResponse | null>(null);
  const [currencyName, setCurrencyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<SystemSettingsPresentationCurrencyResponse>(
        '/system-settings/presentation-currency',
      )
      .then((res) => setCurrencyName(res.presentationCurrency?.name ?? null))
      .catch(() => setCurrencyName(null));
  }, []);

  const presetOptions = useMemo(() => [
    { key: 'all', label: t('presetAll') },
    { key: 'last7', label: t('presetLast7') },
    { key: 'last30', label: t('presetLast30') },
    { key: 'thisMonth', label: t('presetThisMonth') },
    { key: 'lastMonth', label: t('presetLastMonth') },
    { key: 'thisQuarter', label: t('presetThisQuarter') },
    { key: 'thisYear', label: t('presetThisYear') },
    { key: 'lastYear', label: t('presetLastYear') },
    { key: 'custom', label: t('presetCustom') },
  ], [t]);

  const handlePresetChange = useCallback((key: string) => {
    setPreset(key);
    if (key === 'all') {
      setFromDate('');
      setToDate('');
    } else if (key !== 'custom') {
      const { from, to } = getPresetRange(key);
      setFromDate(from);
      setToDate(to);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (agentId) params.set('agentId', agentId);
      if (channelId) params.set('channelId', channelId);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      const qs = params.toString();
      const result = await api.get<DashboardSummaryResponse>(
        `/dashboard/summary${qs ? `?${qs}` : ''}`,
      );
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [agentId, channelId, fromDate, toDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const net = data
    ? (parseFloat(data.totalRevenue) - parseFloat(data.totalExpenses)).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={agentId || '__all__'}
          onValueChange={(v) => setAgentId(v === '__all__' ? '' : v)}
        >
          <SelectTrigger className="w-auto min-w-[10rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('allAgents')}</SelectItem>
            {agents.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={channelId || '__all__'}
          onValueChange={(v) => setChannelId(v === '__all__' ? '' : v)}
        >
          <SelectTrigger className="w-auto min-w-[10rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('allChannels')}</SelectItem>
            {channels.map((ch) => (
              <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-auto min-w-[8rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {presetOptions.map((o) => (
              <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {preset === 'custom' && (
          <>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </>
        )}
      </div>

      {/* Summary cards */}
      {loading ? (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      ) : data ? (
        <>
          {data.notConvertedCount > 0 && (
            <div className="rounded-md border border-yellow-400 bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
              {t('notConvertedWarning', { count: data.notConvertedCount })}
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground">{t('totalRevenue')}</div>
              <div
                className={`text-2xl font-bold ${parseFloat(data.totalRevenue) > 0 ? 'text-emerald-600' : ''}`}
              >
                {formatMoney(data.totalRevenue, currencyName)}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground">{t('totalExpenses')}</div>
              <div
                className={`text-2xl font-bold ${parseFloat(data.totalExpenses) > 0 ? 'text-rose-600' : ''}`}
              >
                {formatMoney(data.totalExpenses, currencyName)}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground">{t('net')}</div>
              <div
                className={`text-2xl font-bold ${
                  parseFloat(net) > 0
                    ? 'text-emerald-600'
                    : parseFloat(net) < 0
                      ? 'text-rose-600'
                      : ''
                }`}
              >
                {formatMoney(net, currencyName)}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground">{t('invoiceCount')}</div>
              <div className="text-2xl font-bold">{data.invoiceCount}</div>
            </div>
          </div>

          {/* Chart */}
          <RevenueExpensesChart data={data.timeSeries} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t('noData')}</p>
      )}
    </div>
  );
}
