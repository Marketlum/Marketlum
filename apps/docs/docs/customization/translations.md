---
sidebar_position: 3
---

# Translations & Locales

Marketlum ships with English (`en`) and Polish (`pl`) translations bundled in `@marketlum/ui/messages`. The locale is read from a `locale` cookie on each request. You can override individual strings, add a new language, or change the default.

## How locales are loaded

The scaffold&apos;s `apps/web/src/i18n/request.ts` resolves the active locale and loads its messages from `@marketlum/ui`:

```ts
const messagesByLocale = {
  en: () => import('@marketlum/ui/messages/en'),
  pl: () => import('@marketlum/ui/messages/pl'),
};
```

To customize, edit this file directly &mdash; it lives in your project.

## Override specific strings

Create a local override file and merge it on top of the upstream messages.

```ts title="apps/web/src/i18n/request.ts"
import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { locales, defaultLocale, type Locale } from '@marketlum/ui';
import enOverrides from '../messages/en.overrides.json';

const messagesByLocale = {
  en: async () => {
    const base = (await import('@marketlum/ui/messages/en')).default;
    return { default: { ...base, ...enOverrides } };
  },
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
```

Put overrides in `apps/web/src/messages/en.overrides.json`:

```json
{
  "Dashboard.title": "Acme Control Center",
  "Common.welcome": "Welcome to Acme"
}
```

Top-level keys merge; if you need to override a nested key, override the full nested object.

## Add a new language

1. Create `apps/web/src/messages/de.json` (start by copying `node_modules/@marketlum/ui/messages/en.json`).
2. Register it in `request.ts`:

```ts
const customLocales = ['en', 'pl', 'de'] as const;
type CustomLocale = (typeof customLocales)[number];

const messagesByLocale = {
  en: () => import('@marketlum/ui/messages/en'),
  pl: () => import('@marketlum/ui/messages/pl'),
  de: () => import('../messages/de.json'),
} satisfies Record<CustomLocale, () => Promise<{ default: Record<string, unknown> }>>;
```

3. Use your local `customLocales` array in place of the imported `locales` when validating the cookie.

The locale switcher in the admin UI reads from the `locales` export of `@marketlum/ui`; to surface a new language in the dropdown, render your own switcher using `customLocales`.

## Change the default locale

The default is `en`. To change it, validate the cookie against your own default:

```ts
const myDefaultLocale = 'pl';
const locale = locales.includes(raw as Locale) ? (raw as Locale) : myDefaultLocale;
```

## Translatable domain content

User-facing entity fields (names, descriptions) are not in the i18n message bundle. They are stored per-`Locale` row in the database and managed through the **Locales** admin page. See [Taxonomies & Archetypes](/customization/taxonomies-archetypes) for how this fits with the rest of the domain model.
