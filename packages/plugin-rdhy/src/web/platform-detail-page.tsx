'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import {
  api,
  Button,
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
} from '@marketlum/ui';
import type { PluginRouteComponentProps } from '@marketlum/ui';
import type { RdhyPlatformDetailResponse } from '../shared/schemas';

interface ValueStreamTreeNode {
  id: string;
  code: string;
  name: string;
  level: number;
  children?: ValueStreamTreeNode[];
}

interface ValueStreamOption {
  id: string;
  code: string;
  name: string;
  label: string;
}

function flattenTree(nodes: ValueStreamTreeNode[], path: string[] = []): ValueStreamOption[] {
  return nodes.flatMap((node) => {
    const label = [...path, node.name].join(' / ');
    return [
      { id: node.id, code: node.code, name: node.name, label },
      ...flattenTree(node.children ?? [], [...path, node.name]),
    ];
  });
}

/** Page rendered at /admin/x/platforms/:id — platform detail + member management. */
export function PlatformDetailPage({ params }: PluginRouteComponentProps) {
  const id = params?.id;
  const t = useTranslations('plugin.rdhy.detail');
  const tp = useTranslations('plugin.rdhy.platforms');
  const router = useRouter();

  const [platform, setPlatform] = useState<RdhyPlatformDetailResponse | null>(null);
  const [options, setOptions] = useState<ValueStreamOption[]>([]);
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
      .get<ValueStreamTreeNode[]>('/value-streams/tree')
      .then((tree) => setOptions(flattenTree(tree)))
      .catch(() => undefined);
  }, [load]);

  const memberIds = useMemo(
    () => new Set(platform?.members.map((m) => m.id) ?? []),
    [platform],
  );

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return options
      .filter((o) => !memberIds.has(o.id))
      .filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.code.toLowerCase().includes(q) ||
          o.label.toLowerCase().includes(q),
      )
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

  const assign = async (valueStreamId: string) => {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await api.put(`/plugins/rdhy/value-streams/${valueStreamId}/platform`, {
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

  const detach = async (valueStreamId: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/plugins/rdhy/value-streams/${valueStreamId}/platform`);
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            {t('edit')}
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            {t('delete')}
          </Button>
        </div>
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
              <TableHead>{tp('code')}</TableHead>
              <TableHead>{tp('name')}</TableHead>
              <TableHead>{t('level')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {platform.members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-mono text-xs">{member.code}</TableCell>
                <TableCell>{member.name}</TableCell>
                <TableCell>{member.level}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => detach(member.id)}
                    disabled={busy}
                  >
                    {t('remove')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

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
                  <span className="text-sm">
                    {option.label}{' '}
                    <span className="font-mono text-xs text-muted-foreground">
                      ({option.code})
                    </span>
                  </span>
                  <Button size="sm" onClick={() => assign(option.id)} disabled={busy}>
                    {t('add')}
                  </Button>
                </li>
              ))}
            </ul>
          ))}
      </div>

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
