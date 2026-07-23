'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import {
  api,
  Button,
  Can,
  ConfirmDeleteDialog,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  usePermissions,
} from '@marketlum/ui';
import type { PluginRouteComponentProps } from '@marketlum/ui';
import type { RdhyPlatformDetailResponse } from '../shared/schemas';
import type { RdhyVamAgreementSummary } from '../shared/vam-schemas';
import { VamStatusBadge } from './vam-status-badge';

interface AgentOption {
  id: string;
  label: string;
}

/** Page rendered at /admin/x/platforms/:id — platform detail + member management. */
export function PlatformDetailPage({ params }: PluginRouteComponentProps) {
  const id = params?.id;
  const t = useTranslations('plugin.rdhy.detail');
  const tp = useTranslations('plugin.rdhy.platforms');
  const tv = useTranslations('plugin.rdhy.vam.platformSection');
  const router = useRouter();
  const { can } = usePermissions();
  const canWriteAgents = can('rdhy.agents', 'write');

  const [platform, setPlatform] = useState<RdhyPlatformDetailResponse | null>(null);
  const [sponsored, setSponsored] = useState<RdhyVamAgreementSummary[]>([]);
  const [options, setOptions] = useState<AgentOption[]>([]);
  const [query, setQuery] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return Promise.resolve();
    return api
      .get<RdhyPlatformDetailResponse>(`/plugins/rdhy/platforms/${id}`)
      .then((p) => {
        setPlatform(p);
        setName(p.name);
        setDescription(p.description ?? '');
      })
      .catch(() => setError(tp('failed')));
  }, [id, tp]);

  useEffect(() => {
    load();
    api
      .get<{ data: Array<{ id: string; name: string }> }>('/agents?limit=1000')
      .then((res) => setOptions(res.data.map((a) => ({ id: a.id, label: a.name }))))
      .catch(() => undefined);
    if (id) {
      api
        .get<RdhyVamAgreementSummary[]>(`/plugins/rdhy/platforms/${id}/vam-agreements`)
        .then(setSponsored)
        .catch(() => undefined);
    }
  }, [load, id]);

  const memberIds = useMemo(
    () => new Set(platform?.members.map((m) => m.id) ?? []),
    [platform],
  );

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return options
      .filter((o) => !memberIds.has(o.id))
      .filter((o) => o.label.toLowerCase().includes(q))
      .slice(0, 10);
  }, [options, memberIds, query]);

  const save = async () => {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/plugins/rdhy/platforms/${id}`, {
        name,
        description: description || null,
      });
      setEditOpen(false);
      await load();
    } catch {
      setError(tp('failed'));
    } finally {
      setBusy(false);
    }
  };

  const removePlatform = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await api.delete(`/plugins/rdhy/platforms/${id}`);
      router.push('/admin/x/platforms');
    } catch {
      setBusy(false);
      setDeleteOpen(false);
      setError(tp('failed'));
    }
  };

  const assign = async (agentId: string) => {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await api.put(`/plugins/rdhy/agents/${agentId}/platform`, {
        platformId: id,
      });
      setQuery('');
      await load();
    } catch {
      setError(tp('failed'));
    } finally {
      setBusy(false);
    }
  };

  const detach = async (agentId: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/plugins/rdhy/agents/${agentId}/platform`);
      await load();
    } catch {
      setError(tp('failed'));
    } finally {
      setBusy(false);
    }
  };

  if (!platform) {
    return (
      <p className="text-sm text-muted-foreground">{error ?? 'Loading…'}</p>
    );
  }

  return (
    <div>
      <Link
        href="/admin/x/platforms"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('back')}
      </Link>

      <div className="mb-1 flex items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">
          {platform.name}{' '}
          <span className="font-mono text-sm font-normal text-muted-foreground">
            ({platform.code})
          </span>
        </h1>
        <Can resource="rdhy.platforms" action="write">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              {t('edit')}
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              {t('delete')}
            </Button>
          </div>
        </Can>
      </div>
      {platform.description && (
        <p className="mb-4 md:mb-6 text-sm text-muted-foreground">{platform.description}</p>
      )}

      <h2 className="mb-2 mt-6 text-lg font-semibold">{t('membersTitle')}</h2>
      {platform.members.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noMembers')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tp('name')}</TableHead>
              <TableHead>{t('agentType')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {platform.members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>{member.name}</TableCell>
                <TableCell className="text-muted-foreground">{member.type}</TableCell>
                <TableCell className="text-right">
                  {canWriteAgents && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => detach(member.id)}
                      disabled={busy}
                    >
                      {t('remove')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {canWriteAgents && (
        <div className="mt-4 max-w-md space-y-1">
          <Label htmlFor="rdhy-add-member">{t('addLabel')}</Label>
          <Input
            id="rdhy-add-member"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('addPlaceholder')}
          />
          {query.trim() &&
            (candidates.length === 0 ? (
              <p className="pt-1 text-sm text-muted-foreground">{t('noMatches')}</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {candidates.map((option) => (
                  <li key={option.id} className="flex items-center justify-between gap-2 p-2">
                    <span className="text-sm">{option.label}</span>
                    <Button size="sm" onClick={() => assign(option.id)} disabled={busy}>
                      {t('add')}
                    </Button>
                  </li>
                ))}
              </ul>
            ))}
        </div>
      )}

      <h2 className="mb-2 mt-8 text-lg font-semibold">{tv('title')}</h2>
      {sponsored.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tv('empty')}</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {sponsored.map((agreement) => (
            <li key={agreement.id} className="flex items-center gap-2">
              <Link
                href={`/admin/x/vam-agreements/${agreement.id}`}
                className="underline-offset-2 hover:underline"
              >
                {agreement.title}
              </Link>
              <VamStatusBadge status={agreement.status} />
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tp('editTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="rdhy-edit-name">{tp('name')}</Label>
              <Input
                id="rdhy-edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rdhy-edit-description">{tp('descriptionLabel')}</Label>
              <Textarea
                id="rdhy-edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={busy}>
              {tp('cancel')}
            </Button>
            <Button onClick={save} disabled={busy || !name}>
              {tp('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={removePlatform}
        title={t('deleteTitle')}
        description={t('deleteDescription')}
        isDeleting={busy}
      />
    </div>
  );
}
