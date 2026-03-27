import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { locales, defaultLocale, type Locale } from '@marketlum/ui';

const messagesByLocale = {
  en: () => import('@marketlum/ui/messages/en'),
  pl: () => import('@marketlum/ui/messages/pl'),
} satisfies Record<Locale, () => Promise<{ default: Record<string, unknown> }>>;

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get('locale')?.value;
  const locale: Locale = locales.includes(raw as Locale) ? (raw as Locale) : defaultLocale;

  return {
    locale,
    messages: (await messagesByLocale[locale]()).default,
  };
});
