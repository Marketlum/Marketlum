'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Network } from 'lucide-react';
import {
  api,
  Button,
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
import type { RdhyPlatformResponse } from '../shared/schemas';

/** Page rendered at /admin/x/platforms: the RDHY platform catalog. */
export function PlatformsListPage() {
  const t = useTranslations('plugin.rdhy.platforms');
  const [platforms, setPlatforms] = useState<RdhyPlatformResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    return api
      .get<RdhyPlatformResponse[]>('/plugins/rdhy/platforms')
      .then(setPlatforms)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const create = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post('/plugins/rdhy/platforms', {
        code,
        name,
        description: description || null,
      });
      setCreateOpen(false);
      setCode('');
      setName('');
      setDescription('');
      await load();
    } catch {
      setError(t('failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="mb-1 flex items-center gap-2 md:gap-3 text-2xl md:text-3xl font-bold">
        <Network className="h-6 w-6 md:h-8 md:w-8" />
        {t('title')}
      </h1>
      <p className="mb-4 md:mb-6 text-sm text-muted-foreground">{t('description')}</p>

      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>{t('create')}</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : platforms.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('code')}</TableHead>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('members')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {platforms.map((platform) => (
              <TableRow key={platform.id}>
                <TableCell className="font-mono text-xs">{platform.code}</TableCell>
                <TableCell>{platform.name}</TableCell>
                <TableCell>{platform.memberCount}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/x/platforms/${platform.id}`}>{t('open')}</Link>
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
            <DialogTitle>{t('createTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="rdhy-platform-code">{t('code')}</Label>
              <Input
                id="rdhy-platform-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="industrial_platform"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rdhy-platform-name">{t('name')}</Label>
              <Input
                id="rdhy-platform-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rdhy-platform-description">{t('descriptionLabel')}</Label>
              <Textarea
                id="rdhy-platform-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button onClick={create} disabled={saving || !code || !name}>
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
