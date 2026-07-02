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
  createValueStream,
  assignValueStream,
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
      /^a value stream exists with code "(.*)" and name "(.*)"$/,
      async (code: string, name: string) => {
        await createValueStream(ctx, code, name);
      },
    );
  }

  function registerAssignedGiven(given: StepFn) {
    given(
      /^the value stream "(.*)" is assigned to the RDHY platform "(.*)"$/,
      async (valueStreamCode: string, platformCode: string) => {
        const res = await assignValueStream(ctx, valueStreamCode, platformCode);
        expect(res.status).toBe(200);
      },
    );
  }

  function registerAssignWhen(when: StepFn) {
    when(
      /^I assign the value stream "(.*)" to the RDHY platform "(.*)"$/,
      async (valueStreamCode: string, platformCode: string) => {
        ctx.response = await assignValueStream(ctx, valueStreamCode, platformCode);
      },
    );
  }

  function registerDetachWhen(when: StepFn) {
    when(/^I detach the value stream "(.*)" from its RDHY platform$/, async (code: string) => {
      ctx.response = await request(getApp().getHttpServer())
        .delete(`/plugins/rdhy/value-streams/${ctx.valueStreams.get(code)}/platform`)
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
      /^the RDHY platform of the value stream "(.*)" is "(.*)"$/,
      async (valueStreamCode: string, platformCode: string) => {
        const res = await lookupPlatform(ctx, valueStreamCode);
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

  test('Assigning a value stream to a platform', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerAssignWhen(when);
    registerStatus(then);
    registerPlatformOfIs(and);
  });

  test('Reassigning silently moves the value stream to the new platform', ({
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

  test('Detaching a value stream from its platform', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerAssignedGiven(given);
    registerDetachWhen(when);
    registerStatus(then);
    and(/^the value stream "(.*)" is not assigned to any RDHY platform$/, async (code: string) => {
      await expectUnassigned(ctx, code);
    });
  });

  test('Detaching an unassigned value stream is idempotent', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerDetachWhen(when);
    registerStatus(then);
  });

  test('Looking up the platform of an unassigned value stream returns null', ({
    given,
    and,
    when,
    then,
  }) => {
    registerBackground(given, and);
    when(/^I look up the RDHY platform of the value stream "(.*)"$/, async (code: string) => {
      ctx.response = await lookupPlatform(ctx, code);
    });
    registerStatus(then);
    and(/^the RDHY platform lookup returns no platform$/, () => {
      expect(ctx.response.body.platform).toBeNull();
    });
  });

  test('Assigning an unknown value stream fails', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(
      /^I assign an unknown value stream to the RDHY platform "(.*)"$/,
      async (platformCode: string) => {
        ctx.response = await request(getApp().getHttpServer())
          .put(`/plugins/rdhy/value-streams/${randomUUID()}/platform`)
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
      /^I assign the value stream "(.*)" to an unknown RDHY platform$/,
      async (valueStreamCode: string) => {
        ctx.response = await request(getApp().getHttpServer())
          .put(`/plugins/rdhy/value-streams/${ctx.valueStreams.get(valueStreamCode)}/platform`)
          .set('Cookie', [ctx.authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ platformId: randomUUID() });
      },
    );
    registerStatus(then);
  });

  test('Deleting a value stream removes its platform assignment', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerAssignedGiven(given);
    when(
      /^I delete the value stream "(.*)" through the core API$/,
      async (code: string) => {
        ctx.response = await request(getApp().getHttpServer())
          .delete(`/value-streams/${ctx.valueStreams.get(code)}`)
          .set('Cookie', [ctx.authCookie])
          .set('X-CSRF-Protection', '1');
      },
    );
    registerStatus(then);
    registerMemberCount(and);
  });
});
