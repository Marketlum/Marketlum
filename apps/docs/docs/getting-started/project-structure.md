---
sidebar_position: 3
---

# Project Structure

Marketlum is organized as a pnpm monorepo with the following structure:

```
my-market/
├── apps/
│   ├── api/          # NestJS API application
│   └── web/          # Next.js web application
├── .env              # Environment variables
├── docker-compose.yml
├── package.json      # Root scripts
└── pnpm-workspace.yaml
```

## Apps

### `apps/api`

The backend API built with NestJS. It imports `@marketlum/core` which provides all business logic, entities, and database configuration.

Key files:
- `src/main.ts` &mdash; HTTP server entry point
- `src/cli.ts` &mdash; CLI entry point (seed commands)
- `src/app.module.ts` &mdash; Root module importing `MarketlumCoreModule`
- `src/data-source.ts` &mdash; TypeORM data source for migrations

### `apps/web`

The frontend built with Next.js 14 (App Router). It imports `@marketlum/ui` for all pages and components, and `@marketlum/shared` for type definitions.

Key files:
- `src/app/` &mdash; Next.js pages (login, admin dashboard, entity pages)
- `src/i18n/` &mdash; Internationalization configuration
- `src/middleware.ts` &mdash; Auth redirect middleware

## Packages (provided by Marketlum)

These packages are installed as dependencies from npm:

| Package | Purpose |
|---------|---------|
| `@marketlum/core` | NestJS modules, entities, services, migrations, CLI commands |
| `@marketlum/shared` | Zod schemas, TypeScript types, enums, state machines |
| `@marketlum/ui` | React components, pages, hooks, i18n messages |

## Root Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start API and web in parallel |
| `pnpm build` | Build all packages |
| `pnpm migration:run` | Run database migrations |
| `pnpm migration:revert` | Revert last migration |
| `pnpm seed:admin` | Seed the admin user |
| `pnpm seed:sample` | Seed realistic sample data |
