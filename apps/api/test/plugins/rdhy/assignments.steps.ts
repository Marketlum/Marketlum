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
  createRdhyAgent,
  assignAgent,
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
      /^an agent exists with name "(.*)"$/,
      async (name: string) => {
        await createRdhyAgent(ctx, name);
      },
    );
  }

  function registerAssignedGiven(given: StepFn) {
    given(
      /^the agent "(.*)" is assigned to the RDHY platform "(.*)"$/,
      async (agentName: string, platformCode: string) => {
        const res = await assignAgent(ctx, agentName, platformCode);
        expect(res.status).toBe(200);
      },
    );
  }

  function registerAssignWhen(when: StepFn) {
    when(
      /^I assign the agent "(.*)" to the RDHY platform "(.*)"$/,
      async (agentName: string, platformCode: string) => {
        ctx.response = await assignAgent(ctx, agentName, platformCode);
      },
    );
  }

  function registerDetachWhen(when: StepFn) {
    when(/^I detach the agent "(.*)" from its RDHY platform$/, async (code: string) => {
      ctx.response = await request(getApp().getHttpServer())
        .delete(`/plugins/rdhy/agents/${ctx.agents.get(code)}/platform`)
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
      /^the RDHY platform of the agent "(.*)" is "(.*)"$/,
      async (agentName: string, platformCode: string) => {
        const res = await lookupPlatform(ctx, agentName);
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

  test('Assigning an agent to a platform', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerAssignWhen(when);
    registerStatus(then);
    registerPlatformOfIs(and);
  });

  test('Reassigning silently moves the agent to the new platform', ({
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

  test('Detaching an agent from its platform', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerAssignedGiven(given);
    registerDetachWhen(when);
    registerStatus(then);
    and(/^the agent "(.*)" is not assigned to any RDHY platform$/, async (code: string) => {
      await expectUnassigned(ctx, code);
    });
  });

  test('Detaching an unassigned agent is idempotent', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerDetachWhen(when);
    registerStatus(then);
  });

  test('Looking up the platform of an unassigned agent returns null', ({
    given,
    and,
    when,
    then,
  }) => {
    registerBackground(given, and);
    when(/^I look up the RDHY platform of the agent "(.*)"$/, async (code: string) => {
      ctx.response = await lookupPlatform(ctx, code);
    });
    registerStatus(then);
    and(/^the RDHY platform lookup returns no platform$/, () => {
      expect(ctx.response.body.platform).toBeNull();
    });
  });

  test('Assigning an unknown agent fails', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(
      /^I assign an unknown agent to the RDHY platform "(.*)"$/,
      async (platformCode: string) => {
        ctx.response = await request(getApp().getHttpServer())
          .put(`/plugins/rdhy/agents/${randomUUID()}/platform`)
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
      /^I assign the agent "(.*)" to an unknown RDHY platform$/,
      async (agentName: string) => {
        ctx.response = await request(getApp().getHttpServer())
          .put(`/plugins/rdhy/agents/${ctx.agents.get(agentName)}/platform`)
          .set('Cookie', [ctx.authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ platformId: randomUUID() });
      },
    );
    registerStatus(then);
  });

  test('Deleting an agent removes its platform assignment', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerAssignedGiven(given);
    when(
      /^I delete the agent "(.*)" through the core API$/,
      async (code: string) => {
        ctx.response = await request(getApp().getHttpServer())
          .delete(`/agents/${ctx.agents.get(code)}`)
          .set('Cookie', [ctx.authCookie])
          .set('X-CSRF-Protection', '1');
      },
    );
    registerStatus(then);
    registerMemberCount(and);
  });
});
