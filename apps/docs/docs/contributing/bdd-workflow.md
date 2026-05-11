---
sidebar_position: 4
---

# BDD Workflow

Marketlum follows a strict Behavior-Driven Development workflow. **No endpoint or UI behavior is implemented before the corresponding `.feature` file and step definitions exist.** This is the single most important convention in the codebase.

## Why BDD

- The `.feature` files double as living documentation of what the framework promises.
- They keep the API contract honest: if a scenario passes, the behavior works end-to-end through HTTP, the DB, and back.
- They give reviewers a clear before/after when reading a PR.

## The three layers

```
packages/bdd/features/<domain>/<feature>.feature      Gherkin scenarios
                       ↓
apps/api/test/<domain>/<feature>.steps.ts             jest-cucumber step definitions
                       ↓
packages/core/src/<domain>/                            Implementation
```

## Workflow for a new feature

### 1. Write the feature file

Start with a `.feature` file in `packages/bdd/features/<domain>/`. Match the existing style.

```gherkin title="packages/bdd/features/widgets/create-widget.feature"
Feature: Create Widget

  Scenario: Authenticated user creates a widget
    Given I am authenticated as an admin
    When I create a widget with name "Widget A"
    Then the response status should be 201
    And the response should contain a widget with name "Widget A"

  Scenario: Validation rejects empty name
    Given I am authenticated as an admin
    When I create a widget with name ""
    Then the response status should be 400
```

Keep scenarios small. One behavior per scenario beats one mega-scenario with seven `And`s.

### 2. Write step definitions

Create `apps/api/test/<domain>/<feature>.steps.ts` and load the feature with `loadFeature` + `defineFeature`:

```ts title="apps/api/test/widgets/widgets.steps.ts"
import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import {
  bootstrapApp,
  cleanDatabase,
  teardownApp,
  getApp,
  createAuthenticatedUser,
} from '../setup';

const feature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/widgets/create-widget.feature'),
);

defineFeature(feature, (test) => {
  let response: request.Response;
  let cookie: string;

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); });
  afterAll(async () => { await teardownApp(); });

  test('Authenticated user creates a widget', ({ given, when, then, and }) => {
    given(/^I am authenticated as an admin$/, async () => {
      ({ cookie } = await createAuthenticatedUser());
    });

    when(/^I create a widget with name "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .post('/widgets')
        .set('Cookie', cookie)
        .set('X-CSRF-Protection', '1')
        .send({ name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a widget with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });
});
```

Run the test. It should fail with a meaningful error (no endpoint exists yet).

### 3. Implement until green

Now write the controller, service, entity, schema, and migration. Run the test as you go. Stop when the suite is green.

## Conventions and gotchas

### Feature file paths

From a step definition at `apps/api/test/<domain>/`, the path to features is **four levels up**:

```ts
path.resolve(__dirname, '../../../../packages/bdd/features/<domain>/<feature>.feature')
```

### One `and()` per `And` line

`jest-cucumber` requires one step handler per Gherkin step, even if two `And` lines have identical wording. If you have:

```gherkin
And the response status should be 200
And the response status should be 200
```

You need two `and()` calls in the test, not one. (This rarely comes up in practice because identical lines usually indicate a duplicated scenario.)

### Shared app instance

`bootstrapApp()` uses ref-counting so multiple `defineFeature` blocks in the same file (or across files run in serial) can share one NestJS app instance. Don&apos;t call `app.close()` directly; always go through `teardownApp()`.

### Clean state between scenarios

`beforeEach(cleanDatabase)` truncates all tables. Tests should not depend on data created by previous scenarios. If a test needs setup data, create it in a `given` step.

### Authentication

To get a logged-in cookie, use `createAuthenticatedUser()` from `apps/api/test/setup.ts`. It bypasses the HTTP login flow (which would create a chicken-and-egg with auth tests) and returns a cookie directly.

## Where to put what

| Test type | Location |
|-----------|----------|
| HTTP contract for an endpoint | BDD scenario |
| Cross-cutting policy (auth, validation, error shape) | BDD scenario |
| Pure function or utility logic | Plain Jest unit test next to the code |
| UI interaction | Out of scope today &mdash; covered by BDD on the underlying API |

When in doubt, write a BDD scenario.
