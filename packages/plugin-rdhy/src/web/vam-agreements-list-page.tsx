'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FileSpreadsheet } from 'lucide-react';
import {
  api,
  Button,
  Can,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@marketlum/ui';
import type { RdhyPlatformResponse } from '../shared/schemas';
import { VAM_STATUSES, type RdhyVamAgreementSummary } from '../shared/vam-schemas';
import { VamStatusBadge } from './vam-status-badge';

interface AgentOption {
  id: string;
  label: string;
}

interface CurrencyOption {
  id: string;
  code: string;
  name: string;
}

const ALL = '__all__';
const NONE = '__none__';

/** Page rendered at /admin/x/vam-agreements. */
export function VamAgreementsListPage() {
  const t = useTranslations('plugin.rdhy.vam');
  const router = useRouter();

  const [agreements, setAgreements] = useState<RdhyVamAgreementSummary[]>([]);
  const [platforms, setPlatforms] = useState<RdhyPlatformResponse[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [agentOptions, setAgentOptions] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [platformFilter, setPlatformFilter] = useState(ALL);

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [agentQuery, setAgentQuery] = useState('');
  const [agentId, setAgentId] = useState('');
  const [platformId, setPlatformId] = useState('');
  const [horizon, setHorizon] = useState('12');
  const [currencyId, setCurrencyId] = useState(NONE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    return api
      .get<RdhyVamAgreementSummary[]>('/plugins/rdhy/vam-agreements')
      .then(setAgreements)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    Promise.all([
      load(),
      api.get<RdhyPlatformResponse[]>('/plugins/rdhy/platforms').then(setPlatforms),
      api
        .get<{ data: Array<{ id: string; name: string }> }>('/agents?limit=1000')
        .then((res) => setAgentOptions(res.data.map((a) => ({ id: a.id, label: a.name })))),
      api
        .get<{ data: CurrencyOption[] }>('/values?type=currency&limit=100')
        .then((r) => setCurrencies(r.data)),
    ])
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [load]);

  const filtered = useMemo(
    () =>
      agreements
        .filter((a) => statusFilter === ALL || a.status === statusFilter)
        .filter((a) => platformFilter === ALL || a.platform.id === platformFilter),
    [agreements, statusFilter, platformFilter],
  );

  const agentCandidates = useMemo(() => {
    const q = agentQuery.trim().toLowerCase();
    if (!q) return [];
    return agentOptions.filter((a) => a.label.toLowerCase().includes(q)).slice(0, 8);
  }, [agentOptions, agentQuery]);

  const selectedAgent = agentOptions.find((a) => a.id === agentId);

  const create = async () => {
    setSaving(true);
    setError(null);
    try {
      const created = await api.post<RdhyVamAgreementSummary>('/plugins/rdhy/vam-agreements', {
        title,
        agentId,
        platformId,
        horizonMonths: Number(horizon),
        currencyId: currencyId === NONE ? null : currencyId,
      });
      router.push(`/admin/x/vam-agreements/${created.id}`);
    } catch {
      setError(t('create.failed'));
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="mb-1 flex items-center gap-2 md:gap-3 text-2xl md:text-3xl font-bold">
        <FileSpreadsheet className="h-6 w-6 md:h-8 md:w-8" />
        {t('title')}
      </h1>
      <p className="mb-4 md:mb-6 text-sm text-muted-foreground">{t('description')}</p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('list.allStatuses')}</SelectItem>
            {VAM_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`status.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('list.allPlatforms')}</SelectItem>
            {platforms.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Can resource="rdhy.vam-agreements" action="write">
            <Button onClick={() => setCreateOpen(true)}>{t('list.create')}</Button>
          </Can>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('list.empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('list.titleCol')}</TableHead>
              <TableHead>{t('list.agent')}</TableHead>
              <TableHead>{t('list.platform')}</TableHead>
              <TableHead>{t('list.status')}</TableHead>
              <TableHead>{t('list.horizon')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((agreement) => (
              <TableRow key={agreement.id}>
                <TableCell>{agreement.title}</TableCell>
                <TableCell>{agreement.agent.name}</TableCell>
                <TableCell>{agreement.platform.name}</TableCell>
                <TableCell>
                  <VamStatusBadge status={agreement.status} />
                </TableCell>
                <TableCell>{t('list.months', { count: agreement.horizonMonths })}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/x/vam-agreements/${agreement.id}`}>{t('list.open')}</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('create.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="vam-title">{t('create.titleLabel')}</Label>
              <Input id="vam-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vam-agent">{t('create.agent')}</Label>
              {selectedAgent ? (
                <div className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <span>{selectedAgent.label}</span>
                  <Button variant="ghost" size="sm" onClick={() => setAgentId('')}>
                    ×
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    id="vam-agent"
                    value={agentQuery}
                    onChange={(e) => setAgentQuery(e.target.value)}
                    placeholder={t('create.agentPlaceholder')}
                  />
                  {agentCandidates.length > 0 && (
                    <ul className="divide-y rounded-md border">
                      {agentCandidates.map((option) => (
                        <li key={option.id}>
                          <button
                            type="button"
                            className="w-full p-2 text-left text-sm hover:bg-accent"
                            onClick={() => {
                              setAgentId(option.id);
                              setAgentQuery('');
                            }}
                          >
                            {option.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
            <div className="space-y-1">
              <Label>{t('create.platform')}</Label>
              <Select value={platformId} onValueChange={setPlatformId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="vam-horizon">{t('create.horizon')}</Label>
              <Input
                id="vam-horizon"
                type="number"
                min={1}
                max={120}
                value={horizon}
                onChange={(e) => setHorizon(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('create.currency')}</Label>
              <Select value={currencyId} onValueChange={setCurrencyId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t('create.noCurrency')}</SelectItem>
                  {currencies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              {t('create.cancel')}
            </Button>
            <Button
              onClick={create}
              disabled={saving || !title || !agentId || !platformId || !Number(horizon)}
            >
              {t('create.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
