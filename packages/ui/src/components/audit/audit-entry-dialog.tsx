'use client';

import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Copy } from 'lucide-react';
import type { AuditLogResponse } from '@marketlum/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { AuditActorBadge } from './audit-actor-badge';

interface AuditEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: AuditLogResponse | null;
}

export function AuditEntryDialog({ open, onOpenChange, entry }: AuditEntryDialogProps) {
  const t = useTranslations('audit');
  const tc = useTranslations('common');

  if (!entry) return null;

  const rows: Array<[string, string]> = [
    [t('when'), new Date(entry.createdAt).toLocaleString()],
    [t('category'), t(`category_${entry.category}`)],
    [t('action'), entry.action ?? '-'],
    [t('actor'), entry.userEmail ? `${entry.userName ?? ''} <${entry.userEmail}>` : t('actorSystem')],
    [t('apiKey'), entry.apiKeyName ?? '-'],
    [t('entity'), entry.entityType ? `${entry.entityType} ${entry.entityId ?? ''}` : '-'],
    [t('ipAddress'), entry.ip ?? '-'],
    [t('userAgentHeader'), entry.userAgent ?? '-'],
  ];

  const contextJson = JSON.stringify(entry.context, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(contextJson);
    toast.success(t('contextCopied'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t('entryTitle')}
            <AuditActorBadge kind={entry.actorKind} label={t(`kind_${entry.actorKind}`)} />
          </DialogTitle>
          <DialogDescription>{entry.id}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="col-span-2 break-all">{value}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('context')}</span>
            <Button type="button" variant="ghost" size="sm" onClick={handleCopy}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              {t('copyContext')}
            </Button>
          </div>
          <pre className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
            {contextJson}
          </pre>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tc('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
