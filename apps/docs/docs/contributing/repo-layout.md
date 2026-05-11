---
sidebar_position: 3
---

# Repository Layout

Marketlum is a pnpm workspace monorepo. The split between `apps/` and `packages/` reflects a deliberate boundary: `apps/` is what end users get when they scaffold a project; `packages/` is what they consume as npm dependencies.

```
marketlum/
├── apps/
│   ├── api/                    Reference NestJS app (mirrors the scaffolded template)
│   ├── web/                    Reference Next.js app (mirrors the scaffolded template)
│   └── docs/                   Docusaurus docs site
├── packages/
│   ├── core/                   @marketlum/core   — NestJS modules, entities, services, migrations
│   ├── ui/                     @marketlum/ui     — React components, admin pages, hooks, i18n
│   ├── shared/                 @marketlum/shared — Zod schemas, TS types, enums, state machines
│   ├── bdd/                    @marketlum/bdd    — Gherkin feature files (test contract)
│   └── create-marketlum-app/   Scaffolder CLI + template
├── docker-compose.yml          Local Postgres
└── pnpm-workspace.yaml
```

## `apps/`

### `apps/api`

The reference NestJS application that exercises `@marketlum/core`. It is also where BDD step definitions live (`apps/api/test/`). When you change something in `apps/api/src`, check whether the equivalent file in `packages/create-marketlum-app/template/api/` needs the same update.

### `apps/web`

The reference Next.js 14 (App Router) application. Like `apps/api`, it mirrors what gets scaffolded for new users. The actual admin pages and shared components live in `@marketlum/ui` &mdash; this app is mostly a thin shell.

### `apps/docs`

This Docusaurus site. Markdown lives in `apps/docs/docs/`, sidebar config in `apps/docs/sidebars.ts`.

## `packages/`

### `@marketlum/core`

The bulk of the framework. NestJS modules (auth, users, agents, values, taxonomies, exchanges, etc.), TypeORM entities, services, controllers, CLI seed commands, and database migrations all live here. Public exports are listed in `packages/core/src/index.ts`.

When designing a new feature, default to putting it here unless it&apos;s genuinely UI-only or schema-only.

### `@marketlum/ui`

React components and full admin pages. Built with shadcn/ui, TanStack Table, react-hook-form, and next-intl. Exports:

- `.` &mdash; components and hooks
- `./styles` &mdash; global CSS (Tailwind layers, CSS variables)
- `./tailwind-preset` &mdash; Tailwind config preset
- `./messages/en`, `./messages/pl` &mdash; bundled translations

UI changes that affect the admin shell almost always live here.

### `@marketlum/shared`

Zod schemas, TypeScript types, enums, and state machines. The single source of truth for any contract that crosses the API/web boundary. Imported by both `apps/api` and `apps/web` (and their `@marketlum/core` / `@marketlum/ui` dependencies).

After editing this package you **must** rebuild it before the API will see the new exports:

```bash
pnpm --filter @marketlum/shared run build
```

### `@marketlum/bdd`

Plain `.feature` files. Treat these as the test contract: they describe what the framework promises to do. Step definitions in `apps/api/test/` make them executable.

### `packages/create-marketlum-app`

The `npx create-marketlum-app` scaffolder. Its `template/` directory mirrors `apps/api` and `apps/web` (with `.tmpl` extensions for files that need variable substitution). See [Coding Conventions](/contributing/coding-conventions#template-synchronization) for the sync rule.

## Where does my change go?

| You&apos;re changing&hellip; | It goes in&hellip; |
|----------------------|------------------|
| A new entity, service, or endpoint | `packages/core/src/<domain>/` |
| Validation schema or shared type | `packages/shared/src/` |
| An admin page or shared UI component | `packages/ui/src/components/` |
| The shell that imports core/ui | `apps/api/src/`, `apps/web/src/` (then mirror to `template/`) |
| A scenario or step | `.feature` in `packages/bdd/features/`, step def in `apps/api/test/` |
| Documentation | `apps/docs/docs/` |
| Local dev infra | `docker-compose.yml`, root `package.json` |
