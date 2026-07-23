'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Workflow } from 'lucide-react';
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
import { EMC_STATUSES, type RdhyEmcAgreementSummary } from '../shared/emc-schemas';
import { EmcStatusBadge } from './emc-status-badge';

interface CurrencyOption {
  id: string;
  code: string;
  name: string;
}

const ALL = '__all__';
const NONE = '__none__';

/** Page rendered at /admin/x/emc-agreements. */
export function EmcAgreementsListPage() {
  const t = useTranslations('plugin.rdhy.emc');
  const router = useRouter();

  const [agreements, setAgreements] = useState<RdhyEmcAgreementSummary[]>([]);
  const [platforms, setPlatforms] = useState<RdhyPlatformResponse[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [platformFilter, setPlatformFilter] = useState(ALL);

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [platformId, setPlatformId] = useState('');
  const [reinvestment, setReinvestment] = useState('');
  const [currencyId, setCurrencyId] = useState(NONE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    return api
      .get<RdhyEmcAgreementSummary[]>('/plugins/rdhy/emc-agreements')
      .then(setAgreements)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    Promise.all([
      load(),
      api.get<RdhyPlatformResponse[]>('/plugins/rdhy/platforms').then(setPlatforms),
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

  const reinvestmentValid =
    reinvestment.trim() === '' ||
    (Number.isFinite(Number(reinvestment)) && Number(reinvestment) >= 0 && Number(reinvestment) <= 100);

  const create = async () => {
    setSaving(true);
    setError(null);
    try {
      const created = await api.post<RdhyEmcAgreementSummary>('/plugins/rdhy/emc-agreements', {
        title,
        platformId,
        reinvestmentPercent: reinvestment.trim() === '' ? null : Number(reinvestment),
        currencyId: currencyId === NONE ? null : currencyId,
      });
      router.push(`/admin/x/emc-agreements/${created.id}`);
    } catch {
      setError(t('create.failed'));
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="mb-1 flex items-center gap-2 md:gap-3 text-2xl md:text-3xl font-bold">
        <Workflow className="h-6 w-6 md:h-8 md:w-8" />
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
            {EMC_STATUSES.map((s) => (
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
          <Can resource="rdhy.emc-agreements" action="write">
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
              <TableHead>{t('list.platform')}</TableHead>
              <TableHead>{t('list.status')}</TableHead>
              <TableHead>{t('list.reinvestment')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((agreement) => (
              <TableRow key={agreement.id}>
                <TableCell>{agreement.title}</TableCell>
                <TableCell>{agreement.platform.name}</TableCell>
                <TableCell>
                  <EmcStatusBadge status={agreement.status} />
                </TableCell>
                <TableCell className="font-mono">
                  {agreement.reinvestmentPercent != null
                    ? `${Number(agreement.reinvestmentPercent)}%`
                    : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/x/emc-agreements/${agreement.id}`}>{t('list.open')}</Link>
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
              <Label htmlFor="emc-title">{t('create.titleLabel')}</Label>
              <Input id="emc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
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
              <Label htmlFor="emc-reinvestment">{t('create.reinvestment')}</Label>
              <Input
                id="emc-reinvestment"
                type="number"
                min={0}
                max={100}
                value={reinvestment}
                onChange={(e) => setReinvestment(e.target.value)}
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
            <Button onClick={create} disabled={saving || !title || !platformId || !reinvestmentValid}>
              {t('create.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
