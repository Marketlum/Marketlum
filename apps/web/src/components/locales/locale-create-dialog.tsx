'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SUPPORTED_LOCALE_CODES } from '@marketlum/shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LocaleCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (code: string) => Promise<void>;
  existingCodes: string[];
  isSubmitting?: boolean;
}

function getDisplayLabel(code: string): string {
  try {
    const locale = new Intl.Locale(code);
    const langNames = new Intl.DisplayNames(['en'], { type: 'language' });
    const langName = langNames.of(locale.language) ?? code;
    if (locale.region) {
      const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
      const regionName = regionNames.of(locale.region) ?? locale.region;
      return `${code} — ${langName} (${regionName})`;
    }
    return `${code} — ${langName}`;
  } catch {
    return code;
  }
}

export function LocaleCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  existingCodes,
  isSubmitting,
}: LocaleCreateDialogProps) {
  const t = useTranslations('locales');
  const tc = useTranslations('common');
  const [selectedCode, setSelectedCode] = useState<string>('');

  const availableCodes = SUPPORTED_LOCALE_CODES.filter(
    (code) => !existingCodes.includes(code),
  );

  const handleSubmit = async () => {
    if (!selectedCode) return;
    await onSubmit(selectedCode);
    setSelectedCode('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setSelectedCode(''); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('createLocale')}</DialogTitle>
          <DialogDescription>{t('selectCode')}</DialogDescription>
        </DialogHeader>

        {availableCodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noAvailableCodes')}</p>
        ) : (
          <Select value={selectedCode} onValueChange={setSelectedCode}>
            <SelectTrigger>
              <SelectValue placeholder={t('selectCode')} />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {availableCodes.map((code) => (
                <SelectItem key={code} value={code}>
                  {getDisplayLabel(code)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedCode || isSubmitting}
          >
            {isSubmitting ? tc('saving') : tc('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
