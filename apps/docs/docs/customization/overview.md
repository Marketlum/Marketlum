---
sidebar_position: 1
---

# Customization Overview

Marketlum is designed to be customized without forking. Your project owns two thin shells &mdash; `apps/api` and `apps/web` &mdash; that consume `@marketlum/core`, `@marketlum/ui`, and `@marketlum/shared` as npm dependencies. Customization happens in the shells; upstream packages stay upgradable.

## What you can safely customize

| Area | Where | Page |
|------|-------|------|
| Logo, app name, theme colors, fonts | `apps/web` | [Branding](/customization/branding) |
| Languages and translated strings | `apps/web/src/i18n`, `apps/web/messages` | [Translations & Locales](/customization/translations) |
| Database, JWT, file storage, ports | `.env` | [Environment & Configuration](/customization/environment) |
| Initial data | `apps/api/src/cli.module.ts` | [Seed Data](/customization/seed-data) |
| New endpoints, jobs, integrations | `apps/api/src/app.module.ts` | [Extending the API](/customization/extending-api) |
| New pages, custom layouts, middleware | `apps/web/src/app` | [Extending the Web App](/customization/extending-web) |
| Domain model (without code) | Admin UI: Taxonomies, Archetypes | [Taxonomies & Archetypes](/customization/taxonomies-archetypes) |

## What requires forking

Anything that changes the shape of `@marketlum/core` entities, the contract of `@marketlum/shared` Zod schemas, or the internals of `@marketlum/ui` pages is not customization &mdash; it is a fork. If you find yourself wanting to:

- Rename or add columns to a core entity
- Change the meaning of a built-in admin page
- Modify a core service&apos;s business rules

&hellip;open an issue first. Many of these needs can be met by adding a new module alongside core rather than editing core.

## A guiding principle

Treat `apps/api` and `apps/web` as **your** code. Treat `node_modules/@marketlum/*` as **someone else&apos;s** code. If a customization can be done in the former, do it there. If it cannot, the upstream package is probably missing an extension point &mdash; that is a framework gap worth reporting.
