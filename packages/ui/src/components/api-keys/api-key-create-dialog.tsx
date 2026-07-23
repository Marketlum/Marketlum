'use client';

import { useState } from 'react';
import { Check, Copy, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { ApiKeyCreated } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface ApiKeyCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const EXPIRY_PRESET_DAYS = [30, 90, 365];

function presetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ApiKeyCreateDialog({ open, onOpenChange, onCreated }: ApiKeyCreateDialogProps) {
  const t = useTranslations('apiKeys');
  const tc = useTranslations('common');
  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setName('');
    setExpiresAt('');
    setCreatedKey(null);
    setCopied(false);
  };

  const handleOpenChange = (o: boolean) => {
    onOpenChange(o);
    if (!o) reset();
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await api.post<ApiKeyCreated>('/api-keys', {
        name: name.trim(),
        ...(expiresAt && { expiresAt: new Date(`${expiresAt}T23:59:59`).toISOString() }),
      });
      setCreatedKey(result.key);
      onCreated();
    } catch {
      toast.error(t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    toast.success(t('copied'));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {createdKey === null ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('createKey')}</DialogTitle>
              <DialogDescription>{t('createDescription')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key-name">{t('name')}</Label>
                <Input
                  id="api-key-name"
                  value={name}
                  maxLength={100}
                  placeholder={t('namePlaceholder')}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-key-expires">{t('expiresLabel')}</Label>
                <Input
                  id="api-key-expires"
                  type="date"
                  value={expiresAt}
                  min={presetDate(1)}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
                <div className="flex gap-2">
                  {EXPIRY_PRESET_DAYS.map((days) => (
                    <Button
                      key={days}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setExpiresAt(presetDate(days))}
                    >
                      {t('presetDays', { days })}
                    </Button>
                  ))}
                  <Button type="button" variant="ghost" size="sm" onClick={() => setExpiresAt('')}>
                    {t('never')}
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSubmit} disabled={!name.trim() || isSubmitting}>
                {isSubmitting ? tc('saving') : tc('create')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t('keyCreatedTitle')}</DialogTitle>
              <DialogDescription>{t('keyCreatedDescription')}</DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded bg-muted px-2 py-1.5 text-sm">
                {createdKey}
              </code>
              <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              {t('keyCreatedWarning')}
            </p>

            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>{tc('done')}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
