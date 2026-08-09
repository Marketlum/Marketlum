'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { KeyRound, Trash2, Copy } from 'lucide-react';
import type { UserResponse } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface ApiKeySummary {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface AgentApiKeysDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserResponse | null;
}

/**
 * Admin-managed API keys for an agent user (spec 025): agents cannot log in,
 * so their keys are provisioned here rather than via the self-service page.
 */
export function AgentApiKeysDialog({ open, onOpenChange, user }: AgentApiKeysDialogProps) {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [plaintextKey, setPlaintextKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchKeys = useCallback(async () => {
    if (!user) return;
    try {
      setKeys(await api.get<ApiKeySummary[]>(`/users/${user.id}/api-keys`));
    } catch {
      toast.error(t('agentKeysFailedToLoad'));
    }
  }, [user, t]);

  useEffect(() => {
    if (open) {
      setPlaintextKey(null);
      setNewKeyName('');
      fetchKeys();
    }
  }, [open, fetchKeys]);

  const handleCreate = async () => {
    if (!user || !newKeyName.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await api.post<ApiKeySummary & { key: string }>(
        `/users/${user.id}/api-keys`,
        { name: newKeyName.trim() },
      );
      setPlaintextKey(created.key);
      setNewKeyName('');
      fetchKeys();
    } catch {
      toast.error(t('agentKeysFailedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!user) return;
    try {
      await api.delete(`/users/${user.id}/api-keys/${keyId}`);
      toast.success(t('agentKeyRevoked'));
      fetchKeys();
    } catch {
      toast.error(t('agentKeysFailedToRevoke'));
    }
  };

  const handleCopy = async () => {
    if (!plaintextKey) return;
    await navigator.clipboard.writeText(plaintextKey);
    toast.success(t('agentKeyCopied'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('agentKeysTitle', { name: user?.name ?? '' })}</DialogTitle>
          <DialogDescription>{t('agentKeysDescription')}</DialogDescription>
        </DialogHeader>

        {plaintextKey && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
            <p className="mb-2 text-sm font-medium">{t('agentKeyShownOnce')}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-background px-2 py-1 text-xs">
                {plaintextKey}
              </code>
              <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('agentKeysEmpty')}</p>
          ) : (
            keys.map((key) => (
              <div key={key.id} className="flex items-center justify-between rounded-md border p-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{key.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(key.createdAt).toLocaleDateString()}
                      {key.lastUsedAt
                        ? ` · ${t('agentKeyLastUsed', { date: new Date(key.lastUsedAt).toLocaleString() })}`
                        : ` · ${t('agentKeyNeverUsed')}`}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRevoke(key.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-key-name">{t('agentKeyNameLabel')}</Label>
          <div className="flex gap-2">
            <Input
              id="new-key-name"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder={t('agentKeyNamePlaceholder')}
            />
            <Button type="button" onClick={handleCreate} disabled={isSubmitting || !newKeyName.trim()}>
              {tc('create')}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
