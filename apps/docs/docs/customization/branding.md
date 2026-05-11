---
sidebar_position: 2
---

# Branding

Replace the default Marketlum branding with your own. All branding lives in `apps/web` and uses standard Next.js / Tailwind conventions.

## App name and metadata

Edit `apps/web/src/app/layout.tsx`:

```tsx
export const metadata: Metadata = {
  title: 'Acme Marketplace',
  description: 'The marketplace for Acme Co.',
};
```

This sets the browser tab title and meta description across every page.

## Logo and favicon

Drop your assets into `apps/web/public/`. The default scaffold ships with `logo.png`; replace it in place and any UI component that references `/logo.png` picks it up automatically.

For a favicon, place `favicon.ico` in `apps/web/public/` (Next.js serves it automatically) or add a `<link rel="icon">` in `layout.tsx`.

## Theme colors

The admin UI uses [shadcn/ui](https://ui.shadcn.com)-style CSS variables defined in `@marketlum/ui/styles`. To override them, add your own values to `apps/web/src/app/globals.css` **after** the import:

```css
@import '@marketlum/ui/styles';

@layer base {
  :root {
    --primary: 217 91% 60%;        /* your brand color (HSL, no commas) */
    --primary-foreground: 0 0% 100%;
    --accent: 280 70% 55%;
    --ring: 217 91% 60%;
  }

  .dark {
    --primary: 217 91% 70%;
    --accent: 280 70% 65%;
  }
}
```

Variables you can override:

| Variable | Purpose |
|----------|---------|
| `--background`, `--foreground` | Page background and default text |
| `--primary`, `--primary-foreground` | Primary buttons, focus rings |
| `--secondary`, `--secondary-foreground` | Secondary buttons, badges |
| `--accent`, `--accent-foreground` | Accent highlights |
| `--destructive`, `--destructive-foreground` | Delete buttons, errors |
| `--muted`, `--muted-foreground` | Muted text and surfaces |
| `--border`, `--input`, `--ring` | Borders, inputs, focus rings |
| `--card`, `--popover` | Card and popover backgrounds |
| `--sidebar-bg`, `--sidebar-foreground`, &hellip; | Admin sidebar (always dark) |
| `--radius` | Global border radius |

Values are HSL components without `hsl()` or commas &mdash; this is the shadcn convention.

## Fonts

The scaffold uses [Inter](https://fonts.google.com/specimen/Inter) via `next/font/google`. Swap it in `apps/web/src/app/layout.tsx`:

```tsx
import { Roboto } from 'next/font/google';

const roboto = Roboto({ subsets: ['latin'], weight: ['400', '500', '700'] });

// ...
<body className={roboto.className}>
```

## Tailwind extensions

Your project&apos;s `apps/web/tailwind.config.ts` already extends the `@marketlum/ui` preset. Add your own theme extensions on top:

```ts
import type { Config } from 'tailwindcss';
import uiPreset from '@marketlum/ui/tailwind-preset';

const config: Config = {
  presets: [uiPreset as Config],
  content: [
    './src/**/*.{ts,tsx}',
    './node_modules/@marketlum/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)'],
      },
    },
  },
};

export default config;
```
