# Contributing to Marketlum

Thanks for your interest in contributing. This file is a quick-start; the full guide lives in the docs site.

> **Full Contributing Guide:** [https://docs.marketlum.com/contributing/overview](https://docs.marketlum.com/contributing/overview)

## Quick start

```bash
git clone https://github.com/Marketlum/Marketlum.git
cd marketlum
pnpm install
cp .env.example .env
cp .env.test.example .env.test
pnpm db:up
docker exec -it $(docker ps -qf "ancestor=postgres:16-alpine") \
  psql -U marketlum -c 'CREATE DATABASE marketlum_test;'
pnpm migration:run
pnpm seed:admin
pnpm dev
```

Verify your setup with `pnpm test:e2e` &mdash; it should pass on a fresh clone.

## The BDD rule

Marketlum follows strict Behavior-Driven Development. **No endpoint or UI behavior is implemented before the corresponding `.feature` file and step definitions exist.**

- Feature files: [`packages/bdd/features/`](packages/bdd/features/)
- Step definitions: [`apps/api/test/`](apps/api/test/)

Pull requests that add or change behavior without updating the BDD specs will be asked to add them before review. See the [BDD Workflow](https://docs.marketlum.com/contributing/bdd-workflow) page for the full pattern.

## Where things live

| You&apos;re changing&hellip; | It goes in&hellip; |
|----------------------|------------------|
| A new entity, service, or endpoint | `packages/core/src/<domain>/` |
| Validation schema or shared type | `packages/shared/src/` |
| An admin page or shared UI component | `packages/ui/src/components/` |
| The shell that imports core/ui | `apps/api/src/`, `apps/web/src/` (and mirror to `packages/create-marketlum-app/template/`) |
| A scenario or step | `packages/bdd/features/`, `apps/api/test/` |
| Documentation | `apps/docs/docs/` |

Full layout reference: [Repository Layout](https://docs.marketlum.com/contributing/repo-layout).

## Before opening a PR

- [ ] `pnpm test:e2e` passes locally.
- [ ] `pnpm build` succeeds across all packages.
- [ ] BDD scenarios exist for any new or changed behavior.
- [ ] `apps/api`/`apps/web` changes mirrored into `packages/create-marketlum-app/template/`.
- [ ] If you touched `@marketlum/shared`, you rebuilt it (`pnpm --filter @marketlum/shared run build`).
- [ ] Any schema change has a migration that reverts cleanly.

Detail on each: [Submitting a Pull Request](https://docs.marketlum.com/contributing/submitting-a-pr).

## Commit and PR style

Match the existing `git log` &mdash; short, sentence-case, imperative-ish subjects with no Conventional Commits prefixes. Multi-paragraph bodies welcome when the *why* needs context.

## Read these before your first PR

- [Dev Setup](https://docs.marketlum.com/contributing/dev-setup) &mdash; cloning, environment, troubleshooting
- [Repository Layout](https://docs.marketlum.com/contributing/repo-layout) &mdash; where to put a change
- [BDD Workflow](https://docs.marketlum.com/contributing/bdd-workflow) &mdash; the writing-tests-first pattern
- [Testing](https://docs.marketlum.com/contributing/testing) &mdash; running and debugging the suite
- [Coding Conventions](https://docs.marketlum.com/contributing/coding-conventions) &mdash; TypeORM, Zod, template-sync rules
- [Database Migrations](https://docs.marketlum.com/contributing/migrations) &mdash; when and how to write one
- [Submitting a Pull Request](https://docs.marketlum.com/contributing/submitting-a-pr) &mdash; checklist and review expectations

## Reporting issues

- **Bug or feature request:** [open an issue](https://github.com/Marketlum/Marketlum/issues)
- **Security:** please disclose privately, not in a public issue
