'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MapPinOff } from 'lucide-react';
import { Button } from '../ui/button';

export function AgentMapEmpty() {
  const t = useTranslations('agentsMap');
  return (
    <div className="rounded-md border border-dashed p-16 text-center">
      <MapPinOff className="mx-auto h-10 w-10 text-muted-foreground/60" />
      <p className="mt-3 font-medium">{t('noMappable')}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t('noMappableHint')}</p>
      <Link href="/admin/agents" className="mt-4 inline-block">
        <Button variant="outline" size="sm">{t('backToAgents')}</Button>
      </Link>
    </div>
  );
}
