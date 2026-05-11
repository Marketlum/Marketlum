---
sidebar_position: 2
---

# Dev Setup

Get the Marketlum monorepo running locally.

## Prerequisites

- **Node.js** >= 20.9.0
- **pnpm** >= 10.6
- **Docker** (for PostgreSQL) &mdash; or a local PostgreSQL 16 install

## Clone and install

```bash
git clone https://github.com/Marketlum/Marketlum.git
cd marketlum
pnpm install
```

`pnpm install` resolves the workspace links between `packages/*` and `apps/*`. The first install may take a couple of minutes because of native modules (`bcrypt`).

## Configure environment

```bash
cp .env.example .env
cp .env.test.example .env.test
```

`.env` is used by `pnpm dev` and `pnpm seed:*`. `.env.test` is used by the BDD test suite and points to a separate `marketlum_test` database so tests can&apos;t accidentally clobber dev data.

You normally don&apos;t need to edit either file &mdash; the defaults match the Docker Compose Postgres credentials.

## Start PostgreSQL

```bash
pnpm db:up
```

This runs the `postgres:16-alpine` container defined in `docker-compose.yml` with the `marketlum` user and database. The container persists data in a named volume (`pgdata`) so you can `db:down` / `db:up` without losing local state.

You&apos;ll need a second database for tests:

```bash
docker exec -it marketlum-postgres-1 psql -U marketlum -c 'CREATE DATABASE marketlum_test;'
```

(The container name may differ depending on your Docker Compose version &mdash; check `docker ps`.)

## Run migrations

```bash
pnpm migration:run
```

This builds `@marketlum/core` first, then runs all TypeORM migrations against the dev database. The test database has migrations applied automatically on every test run by `apps/api/test/setup.ts`.

## Seed an admin user

```bash
pnpm seed:admin
```

Creates `admin@marketlum.com` / `password123`. For a richer demo dataset, also run:

```bash
pnpm seed:sample
```

## Start everything

```bash
pnpm dev
```

This first builds the three foundational packages (`@marketlum/shared`, `@marketlum/core`, `@marketlum/ui`) in serial, then starts everything else in parallel:

- API on [http://localhost:3001](http://localhost:3001)
- Web on [http://localhost:3000](http://localhost:3000)
- Swagger at [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
- Watch-mode TypeScript compilers for each package

Log in at [http://localhost:3000/login](http://localhost:3000/login) with the admin credentials.

## Run the docs site

```bash
pnpm docs:dev
```

Serves the docs site you&apos;re reading right now at [http://localhost:3000](http://localhost:3000) (or the next available port).

## Verify everything works

```bash
pnpm test:e2e
```

If this passes, your setup is good. The suite runs 600+ scenarios against the test database; expect it to take a minute or two.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `bcrypt` install fails | pnpm built-deps not whitelisted | Check `.npmrc` lists `bcrypt` under `onlyBuiltDependencies` |
| Migrations fail with &quot;type already exists&quot; | Old data in dev DB | `pnpm db:down && docker volume rm marketlum_pgdata && pnpm db:up && pnpm migration:run` |
| `@marketlum/shared` exports missing in API | Shared package not rebuilt | `pnpm --filter @marketlum/shared run build` |
| API can&apos;t connect to DB | Postgres not started | `pnpm db:up`, then `docker ps` to confirm |
| Tests fail with `marketlum_test` does not exist | Test DB not created | See `CREATE DATABASE` step above |
