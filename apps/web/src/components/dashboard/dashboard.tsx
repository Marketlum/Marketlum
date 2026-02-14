'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { DashboardSummaryResponse } from '@marketlum/shared';
import { api } from '@/lib/api-client';
import { useAgents } from '@/hooks/use-agents';
import { useValueStreams } from '@/hooks/use-value-streams';
import { useChannels } from '@/hooks/use-channels';
import { RevenueExpensesChart } from './revenue-expenses-chart';

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getPresetRange(key: string): { from: string; to: string } {
  const today = new Date();
  const to = formatDate(today);

  switch (key) {
    case 'last7': {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      return { from: formatDate(d), to };
    }
    case 'last30': {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      return { from: formatDate(d), to };
    }
    case 'thisMonth': {
      return { from: formatDate(new Date(today.getFullYear(), today.getMonth(), 1)), to };
    }
    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: formatDate(start), to: formatDate(end) };
    }
    case 'thisQuarter': {
      const q = Math.floor(today.getMonth() / 3);
      return { from: formatDate(new Date(today.getFullYear(), q * 3, 1)), to };
    }
    case 'thisYear': {
      return { from: formatDate(new Date(today.getFullYear(), 0, 1)), to };
    }
    case 'lastYear': {
      return {
        from: formatDate(new Date(today.getFullYear() - 1, 0, 1)),
        to: formatDate(new Date(today.getFullYear() - 1, 11, 31)),
      };
    }
    default:
      return { from: '', to: '' };
  }
}

export function Dashboard() {
  const t = useTranslations('dashboard');
  const { agents } = useAgents();
  const { valueStreams } = useValueStreams();
  const { channels } = useChannels();

  const [agentId, setAgentId] = useState('');
  const [valueStreamId, setValueStreamId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [preset, setPreset] = useState('all');

  const [data, setData] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

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
      if (valueStreamId) params.set('valueStreamId', valueStreamId);
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
  }, [agentId, valueStreamId, channelId, fromDate, toDate]);

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
        <select
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{t('allAgents')}</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <select
          value={valueStreamId}
          onChange={(e) => setValueStreamId(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{t('allValueStreams')}</option>
          {valueStreams.map((vs) => (
            <option key={vs.id} value={vs.id}>{vs.name}</option>
          ))}
        </select>
        <select
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{t('allChannels')}</option>
          {channels.map((ch) => (
            <option key={ch.id} value={ch.id}>{ch.name}</option>
          ))}
        </select>
        <select
          value={preset}
          onChange={(e) => handlePresetChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {presetOptions.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground">{t('totalRevenue')}</div>
              <div className="text-2xl font-bold text-emerald-600">{data.totalRevenue}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground">{t('totalExpenses')}</div>
              <div className="text-2xl font-bold text-rose-600">{data.totalExpenses}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground">{t('net')}</div>
              <div className={`text-2xl font-bold ${parseFloat(net) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {net}
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
