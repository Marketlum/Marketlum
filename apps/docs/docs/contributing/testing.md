---
sidebar_position: 5
---

# Testing

The Marketlum test suite is the BDD scenarios in `packages/bdd/features/` wired up to `jest-cucumber` step definitions in `apps/api/test/`. There are 600+ scenarios spanning 20+ feature areas. Alongside them, internal pure logic is covered by unit tests.

## Unit tests

Pure logic with no HTTP surface — Zod schemas in `@marketlum/shared`, version/namespace helpers and plugin validation in `@marketlum/core`, UI helpers in `@marketlum/ui` — is tested with colocated `*.spec.ts` files run by Jest via `ts-jest`:

```bash
pnpm test:unit
```

This builds `@marketlum/shared` first (core's tests import its compiled output), then runs every package's `test` script. No database is needed, so it is much faster than the e2e suite — use it as the tight feedback loop while working on schemas or helpers.

Unit tests do not need a `.feature` file; the BDD workflow applies to endpoints and UI. Spec files are excluded from package builds (`tsconfig.json` `exclude`), so they never ship in `dist/`.

## Running the suite

```bash
pnpm test:e2e
```

This rebuilds `@marketlum/shared` and `@marketlum/core` first (because tests import their compiled output), then runs all step definitions. Expect a minute or two end-to-end.

## Running a subset

`pnpm test:e2e` accepts standard Jest CLI args:

```bash
# Single feature area
pnpm test:e2e -- --testPathPattern=auth

# Single test file
pnpm test:e2e -- apps/api/test/actors/actors.steps.ts

# Single scenario name
pnpm test:e2e -- -t "Authenticated user creates"

# Watch mode (one feature area)
pnpm test:e2e -- --watch --testPathPattern=values
```

## Test environment

Tests use a separate database, `marketlum_test`, configured via `.env.test`. The shared setup in `apps/api/test/setup.ts`:

1. Loads `.env.test` before any imports.
2. Creates one NestJS app via `Test.createTestingModule({ imports: [AppModule] })`.
3. Runs all migrations on the test DB.
4. Hands out the app to every `defineFeature` block via ref-counting.

The test DB is **never** seeded between scenarios; each scenario starts with all tables truncated (`cleanDatabase()` in `beforeEach`).

## The shared app pattern

`jest-cucumber` calls `defineFeature` once per feature file, and each call gets its own `beforeAll` / `afterAll`. Without ref-counting, the first feature&apos;s `afterAll` would tear down the app and the rest would crash.

```ts
let refCount = 0;

export async function bootstrapApp() {
  refCount++;
  if (app) return app;
  // ... create app
}

export async function teardownApp() {
  refCount--;
  if (refCount <= 0 && app) {
    await app.close();
  }
}
```

Don&apos;t bypass this. Always use `bootstrapApp()` and `teardownApp()` from `apps/api/test/setup.ts`.

## Useful helpers

| Helper | Purpose |
|--------|---------|
| `bootstrapApp()` | Start (or reuse) the shared NestJS app |
| `teardownApp()` | Ref-counted shutdown |
| `cleanDatabase()` | TRUNCATE all tables, clear rate-limiter state |
| `getApp()` | Get the running app for `supertest` |
| `createUserViaService(email, password, name?)` | Create a user without going through HTTP |
| `createAuthenticatedUser({ role? })` | Create a user + return a valid auth cookie |

`createAuthenticatedUser` exists because going through `/auth/login` from inside an auth test creates a chicken-and-egg: you need a logged-in user to test other endpoints, but you don&apos;t want every other test to depend on `/auth/login` working.

## Supertest cheatsheet

```ts
import request from 'supertest';  // v7+ default export, not `* as`

// GET with auth cookie
await request(getApp().getHttpServer())
  .get('/actors')
  .set('Cookie', cookie);

// POST with CSRF header
await request(getApp().getHttpServer())
  .post('/actors')
  .set('Cookie', cookie)
  .set('X-CSRF-Protection', '1')
  .send({ name: 'Acme' });

// File upload (multer)
await request(getApp().getHttpServer())
  .post('/files')
  .set('Cookie', cookie)
  .set('X-CSRF-Protection', '1')
  .attach('file', buffer, { filename: 'a.pdf', contentType: 'application/pdf' })
  .field('folderId', folderId);
```

`X-CSRF-Protection: 1` is required on every state-changing request. The CSRF guard rejects the request without it.

## When tests fail

1. **Read the error**, not just &quot;test failed.&quot; `jest-cucumber` prints the Gherkin step that failed.
2. **Check rebuilds**: if you edited `@marketlum/shared`, did it rebuild? `pnpm --filter @marketlum/shared run build`.
3. **Check the DB**: stale schema can cause cryptic failures. `pnpm migration:run` on the test DB if you added a migration.
4. **Run a single scenario** with `-t "scenario name"` to isolate.
5. **Drop a `console.log(response.body)`** in the step definition. Restart with `--watch` if iterating.

## What we don&apos;t test (yet)

- **No mocked-service unit tests.** NestJS services and controllers are covered by the BDD suite against a real database, not by unit tests with mocked repositories — that duplication calcifies refactoring without adding confidence.
- **No browser UI tests.** Web-side behavior is covered by BDD scenarios against the underlying API. Visual regressions are caught at PR review.
- **No load / performance tests.** Add `EXPLAIN ANALYZE` notes in PR descriptions if a change touches a hot query path.
