'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';

interface ImportInvoiceDialogProps {
  open: boolean;
  onCancel: () => void;
}

export function ImportInvoiceDialog({ open, onCancel }: ImportInvoiceDialogProps) {
  const t = useTranslations('invoices');
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent
        className="sm:max-w-sm"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="sr-only">{t('importExtracting')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('importExtracting')}</p>
          <Button variant="outline" size="sm" onClick={onCancel}>
            {t('importCancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
