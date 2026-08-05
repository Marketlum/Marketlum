import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  bootstrapApp,
  cleanDatabase,
  teardownApp,
  getApp,
  createAuthenticatedUser,
} from '../../setup';
import {
  RdhyCtx,
  makeRdhyCtx,
  createPlatform,
  createRdhyActor,
  assignActor,
  lookupPlatform,
  expectMemberCount,
  expectUnassigned,
} from './rdhy-helpers';

const feature = loadFeature(
  path.resolve(__dirname, '../../../../../packages/plugin-rdhy/features/assignments.feature'),
);

type StepFn = (regex: RegExp | string, fn: (...args: never[]) => unknown) => void;

defineFeature(feature, (test) => {
  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
  });
  afterAll(async () => {
    await teardownApp();
  });

  const ctx: RdhyCtx = makeRdhyCtx();
  beforeEach(() => {
    Object.assign(ctx, makeRdhyCtx());
  });

  function registerBackground(given: StepFn, and: StepFn) {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      ctx.authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(
      /^an RDHY platform exists with code "(.*)" and name "(.*)"$/,
      async (code: string, name: string) => {
        await createPlatform(ctx, code, name);
      },
    );
    and(
      /^an RDHY platform exists with code "(.*)" and name "(.*)"$/,
      async (code: string, name: string) => {
        await createPlatform(ctx, code, name);
      },
    );
    and(
      /^an actor exists with name "(.*)"$/,
      async (name: string) => {
        await createRdhyActor(ctx, name);
      },
    );
  }

  function registerAssignedGiven(given: StepFn) {
    given(
      /^the actor "(.*)" is assigned to the RDHY platform "(.*)"$/,
      async (actorName: string, platformCode: string) => {
        const res = await assignActor(ctx, actorName, platformCode);
        expect(res.status).toBe(200);
      },
    );
  }

  function registerAssignWhen(when: StepFn) {
    when(
      /^I assign the actor "(.*)" to the RDHY platform "(.*)"$/,
      async (actorName: string, platformCode: string) => {
        ctx.response = await assignActor(ctx, actorName, platformCode);
      },
    );
  }

  function registerDetachWhen(when: StepFn) {
    when(/^I detach the actor "(.*)" from its RDHY platform$/, async (code: string) => {
      ctx.response = await request(getApp().getHttpServer())
        .delete(`/plugins/rdhy/actors/${ctx.actors.get(code)}/platform`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1');
    });
  }

  function registerStatus(then: StepFn) {
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(Number(status));
    });
  }

  function registerPlatformOfIs(and: StepFn) {
    and(
      /^the RDHY platform of the actor "(.*)" is "(.*)"$/,
      async (actorName: string, platformCode: string) => {
        const res = await lookupPlatform(ctx, actorName);
        expect(res.status).toBe(200);
        expect(res.body.platform).not.toBeNull();
        expect(res.body.platform.code).toBe(platformCode);
      },
    );
  }

  function registerMemberCount(and: StepFn) {
    and(
      /^the RDHY platform "(.*)" has a member count of (\d+)$/,
      async (code: string, count: string) => {
        await expectMemberCount(ctx, code, Number(count));
      },
    );
  }

  test('Assigning an actor to a platform', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerAssignWhen(when);
    registerStatus(then);
    registerPlatformOfIs(and);
  });

  test('Reassigning silently moves the actor to the new platform', ({
    given,
    and,
    when,
    then,
  }) => {
    registerBackground(given, and);
    registerAssignedGiven(given);
    registerAssignWhen(when);
    registerStatus(then);
    registerPlatformOfIs(and);
    registerMemberCount(and);
  });

  test('Assigning to the same platform twice is idempotent', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerAssignedGiven(given);
    registerAssignWhen(when);
    registerStatus(then);
    registerMemberCount(and);
  });

  test('Detaching an actor from its platform', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerAssignedGiven(given);
    registerDetachWhen(when);
    registerStatus(then);
    and(/^the actor "(.*)" is not assigned to any RDHY platform$/, async (code: string) => {
      await expectUnassigned(ctx, code);
    });
  });

  test('Detaching an unassigned actor is idempotent', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerDetachWhen(when);
    registerStatus(then);
  });

  test('Looking up the platform of an unassigned actor returns null', ({
    given,
    and,
    when,
    then,
  }) => {
    registerBackground(given, and);
    when(/^I look up the RDHY platform of the actor "(.*)"$/, async (code: string) => {
      ctx.response = await lookupPlatform(ctx, code);
    });
    registerStatus(then);
    and(/^the RDHY platform lookup returns no platform$/, () => {
      expect(ctx.response.body.platform).toBeNull();
    });
  });

  test('Assigning an unknown actor fails', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(
      /^I assign an unknown actor to the RDHY platform "(.*)"$/,
      async (platformCode: string) => {
        ctx.response = await request(getApp().getHttpServer())
          .put(`/plugins/rdhy/actors/${randomUUID()}/platform`)
          .set('Cookie', [ctx.authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ platformId: ctx.platforms.get(platformCode) });
      },
    );
    registerStatus(then);
  });

  test('Assigning to an unknown platform fails', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(
      /^I assign the actor "(.*)" to an unknown RDHY platform$/,
      async (actorName: string) => {
        ctx.response = await request(getApp().getHttpServer())
          .put(`/plugins/rdhy/actors/${ctx.actors.get(actorName)}/platform`)
          .set('Cookie', [ctx.authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ platformId: randomUUID() });
      },
    );
    registerStatus(then);
  });

  test('Deleting an actor removes its platform assignment', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerAssignedGiven(given);
    when(
      /^I delete the actor "(.*)" through the core API$/,
      async (code: string) => {
        ctx.response = await request(getApp().getHttpServer())
          .delete(`/actors/${ctx.actors.get(code)}`)
          .set('Cookie', [ctx.authCookie])
          .set('X-CSRF-Protection', '1');
      },
    );
    registerStatus(then);
    registerMemberCount(and);
  });
});
