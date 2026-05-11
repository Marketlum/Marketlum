---
sidebar_position: 7
---

# Extending the Web App

`apps/web` is your own Next.js 14 (App Router) project. It re-exports admin pages and components from `@marketlum/ui`, but you can add your own routes, layouts, and middleware on top.

## Add a new page

Drop a `page.tsx` anywhere under `apps/web/src/app/`. For example, a public marketing landing page:

```tsx title="apps/web/src/app/about/page.tsx"
export default function AboutPage() {
  return (
    <main className="container mx-auto py-16">
      <h1 className="text-4xl font-bold">About Acme</h1>
      <p className="mt-4 text-muted-foreground">
        We&apos;re a marketplace for &hellip;
      </p>
    </main>
  );
}
```

This is served at `/about`. The route is independent of the `/admin` tree.

## Add a new admin page

To add a page inside the admin shell (sidebar, header, auth-gated), nest it under `apps/web/src/app/admin/`:

```tsx title="apps/web/src/app/admin/reports/page.tsx"
import { MyReportsTable } from '@/components/my-reports-table';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <MyReportsTable />
    </div>
  );
}
```

The admin layout (`apps/web/src/app/admin/layout.tsx`) wraps every child page in the sidebar shell, so your page automatically inherits the chrome.

To add a sidebar link, render your own `NavLink` from a custom layout component, or wrap the admin layout. The current core sidebar is not data-driven &mdash; if you need to mutate it, wrap or replace the admin layout file in your project.

## Customize the root layout

`apps/web/src/app/layout.tsx` is yours to edit. Common changes:

- Add analytics (PostHog, Plausible, etc.) by inserting a `<Script>` tag.
- Wrap children in additional providers (e.g. a feature-flag provider).
- Add a custom `<head>` tag.

```tsx
<ThemeProvider>
  <PostHogProvider>
    {children}
    <Toaster />
  </PostHogProvider>
</ThemeProvider>
```

## Use UI components

Anything exported from `@marketlum/ui` is yours to use. Common building blocks:

```tsx
import {
  Button,
  Card, CardHeader, CardTitle, CardContent,
  DataTable,
  Dialog, DialogContent, DialogTitle,
  Input,
} from '@marketlum/ui';
```

For Tailwind to compile these styles, the scaffold&apos;s `tailwind.config.ts` already includes `@marketlum/ui` in its `content` array.

## Middleware

The scaffold ships with `apps/web/src/middleware.ts` for auth redirects. You can extend it for custom rules (geofencing, A/B test cookies, custom redirects). Keep the existing auth checks &mdash; they protect the `/admin` tree.

## Calling the API

The admin pages exported from `@marketlum/ui` already call the API using the `access_token` cookie. For your own pages, use `fetch` directly:

```tsx
'use server';

import { cookies } from 'next/headers';

export async function getMyReports() {
  const cookieStore = await cookies();
  const res = await fetch(`${process.env.API_URL}/my-reports`, {
    headers: { Cookie: `access_token=${cookieStore.get('access_token')?.value ?? ''}` },
    cache: 'no-store',
  });
  return res.json();
}
```

For client components, use the browser&apos;s built-in `credentials: 'include'` &mdash; the JWT cookie is `httpOnly` and goes along automatically.

## Don&apos;t modify upstream pages

The admin pages in `@marketlum/ui` are not designed to be subclassed or partially overridden. If you need a different version of an existing page, copy its source into your own `apps/web/src/app/admin/...` route and replace the re-export. You give up automatic upgrades for that page, but only for that page.
