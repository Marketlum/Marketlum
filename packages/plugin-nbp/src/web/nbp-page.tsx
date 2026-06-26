'use client';

import { useTranslations } from 'next-intl';
import { NbpSettings } from './nbp-settings';

/** Page rendered at /admin/x/nbp (the sidebar entry destination). */
export function NbpPage() {
  const t = useTranslations('plugin.nbp');
  return (
    <div>
      <h1 className="mb-4 text-2xl md:text-3xl font-bold">{t('settings.title')}</h1>
      <NbpSettings />
    </div>
  );
}
