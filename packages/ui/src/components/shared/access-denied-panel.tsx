'use client';

import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '../ui/button';

export function AccessDeniedPanel({ resource }: { resource: string }) {
  const t = useTranslations('common');
  const router = useRouter();

  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <Lock className="h-10 w-10 text-muted-foreground" />
      <h2 className="text-xl font-semibold">{t('accessDeniedTitle')}</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {t('accessDeniedDescription')}{' '}
        <code className="rounded bg-muted px-1.5 py-0.5">{resource}:read</code>
      </p>
      <Button variant="outline" onClick={() => router.back()}>
        {t('goBack')}
      </Button>
    </div>
  );
}
