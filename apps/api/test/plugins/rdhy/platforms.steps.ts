import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import {
  bootstrapApp,
  cleanDatabase,
  teardownApp,
  getApp,
  createAuthenticatedUser,
} from '../../setup';
import { expectEventWithId } from '../../events/event-steps';
import {
  RdhyCtx,
  makeRdhyCtx,
  createPlatform,
  createValueStream,
  assignValueStream,
  listPlatforms,
  expectUnassigned,
} from './rdhy-helpers';

const feature = loadFeature(
  path.resolve(__dirname, '../../../../../packages/plugin-rdhy/features/platforms.feature'),
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

  function registerBackground(given: StepFn) {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      ctx.authCookie = await createAuthenticatedUser(email, 'password123');
    });
  }

  function registerPlatformExists(step: StepFn) {
    step(
      /^an RDHY platform exists with code "(.*)" and name "(.*)"$/,
      async (code: string, name: string) => {
        await createPlatform(ctx, code, name);
      },
    );
  }

  function registerValueStreamExists(step: StepFn) {
    step(
      /^a value stream exists with code "(.*)" and name "(.*)"$/,
      async (code: string, name: string) => {
        await createValueStream(ctx, code, name);
      },
    );
  }

  function registerAssigned(step: StepFn) {
    step(
      /^the value stream "(.*)" is assigned to the RDHY platform "(.*)"$/,
      async (valueStreamCode: string, platformCode: string) => {
        const res = await assignValueStream(ctx, valueStreamCode, platformCode);
        expect(res.status).toBe(200);
      },
    );
  }

  function registerCreate(when: StepFn) {
    when(
      /^I create an RDHY platform with code "(.*)" and name "(.*)"$/,
      async (code: string, name: string) => {
        ctx.response = await request(getApp().getHttpServer())
          .post('/plugins/rdhy/platforms')
          .set('Cookie', [ctx.authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ code, name });
        if (ctx.response.status === 201) {
          ctx.platforms.set(code, ctx.response.body.id);
        }
      },
    );
  }

  function registerStatus(then: StepFn) {
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(Number(status));
    });
  }

  function registerResponseCodeAndName(step: StepFn) {
    step(
      /^the RDHY platform response has code "(.*)" and name "(.*)"$/,
      (code: string, name: string) => {
        expect(ctx.response.body.code).toBe(code);
        expect(ctx.response.body.name).toBe(name);
      },
    );
  }

  test('Creating a platform', ({ given, when, then, and }) => {
    registerBackground(given);
    registerCreate(when);
    registerStatus(then);
    registerResponseCodeAndName(and);
    and(/^the event "(.*)" was published with the new entity's id$/, (eventName: string) => {
      expectEventWithId(eventName);
    });
  });

  test('Rejecting an invalid platform code', ({ given, when, then }) => {
    registerBackground(given);
    registerCreate(when);
    registerStatus(then);
  });

  test('Rejecting a duplicate platform code', ({ given, when, then }) => {
    registerBackground(given);
    registerPlatformExists(given);
    registerCreate(when);
    registerStatus(then);
  });

  test('Listing platforms ordered by name with member counts', ({ given, when, then, and }) => {
    registerBackground(given);
    registerPlatformExists(given);
    registerPlatformExists(and);
    registerValueStreamExists(and);
    registerAssigned(and);
    when(/^I list RDHY platforms$/, async () => {
      ctx.response = await listPlatforms(ctx);
    });
    registerStatus(then);
    and(
      /^the RDHY platform list contains "(.*)" before "(.*)"$/,
      (first: string, second: string) => {
        const names = ctx.response.body.map((p: { name: string }) => p.name);
        expect(names).toContain(first);
        expect(names).toContain(second);
        expect(names.indexOf(first)).toBeLessThan(names.indexOf(second));
      },
    );
    and(
      /^the listed RDHY platform "(.*)" has a member count of (\d+)$/,
      (code: string, count: string) => {
        const platform = ctx.response.body.find((p: { code: string }) => p.code === code);
        expect(platform).toBeDefined();
        expect(platform.memberCount).toBe(Number(count));
      },
    );
    and(
      /^the listed RDHY platform "(.*)" has a member count of (\d+)$/,
      (code: string, count: string) => {
        const platform = ctx.response.body.find((p: { code: string }) => p.code === code);
        expect(platform).toBeDefined();
        expect(platform.memberCount).toBe(Number(count));
      },
    );
  });

  test('Platform detail includes member value stream summaries', ({ given, when, then, and }) => {
    registerBackground(given);
    registerPlatformExists(given);
    registerValueStreamExists(and);
    registerAssigned(and);
    when(/^I get the RDHY platform "(.*)"$/, async (code: string) => {
      ctx.response = await request(getApp().getHttpServer())
        .get(`/plugins/rdhy/platforms/${ctx.platforms.get(code)}`)
        .set('Cookie', [ctx.authCookie]);
    });
    registerStatus(then);
    and(/^the RDHY platform detail lists the member value stream "(.*)"$/, (code: string) => {
      const member = ctx.response.body.members.find((m: { code: string }) => m.code === code);
      expect(member).toBeDefined();
      expect(member.id).toBe(ctx.valueStreams.get(code));
      expect(typeof member.name).toBe('string');
      expect(typeof member.level).toBe('number');
    });
  });

  test("Updating a platform's name and description", ({ given, when, then, and }) => {
    registerBackground(given);
    registerPlatformExists(given);
    when(
      /^I update the RDHY platform "(.*)" with name "(.*)" and description "(.*)"$/,
      async (code: string, name: string, description: string) => {
        ctx.response = await request(getApp().getHttpServer())
          .patch(`/plugins/rdhy/platforms/${ctx.platforms.get(code)}`)
          .set('Cookie', [ctx.authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, description });
      },
    );
    registerStatus(then);
    registerResponseCodeAndName(and);
    and(/^the event "(.*)" was published with the entity's id$/, (eventName: string) => {
      expectEventWithId(eventName);
    });
  });

  test('The platform code cannot be changed after creation', ({ given, when, then, and }) => {
    registerBackground(given);
    registerPlatformExists(given);
    when(
      /^I update the RDHY platform "(.*)" attempting to set code "(.*)"$/,
      async (code: string, newCode: string) => {
        ctx.response = await request(getApp().getHttpServer())
          .patch(`/plugins/rdhy/platforms/${ctx.platforms.get(code)}`)
          .set('Cookie', [ctx.authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ code: newCode });
      },
    );
    registerStatus(then);
    registerResponseCodeAndName(and);
  });

  test('Deleting a platform detaches its member value streams', ({ given, when, then, and }) => {
    registerBackground(given);
    registerPlatformExists(given);
    registerValueStreamExists(and);
    registerAssigned(and);
    when(/^I delete the RDHY platform "(.*)"$/, async (code: string) => {
      ctx.response = await request(getApp().getHttpServer())
        .delete(`/plugins/rdhy/platforms/${ctx.platforms.get(code)}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1');
    });
    registerStatus(then);
    and(/^the value stream "(.*)" is not assigned to any RDHY platform$/, async (code: string) => {
      await expectUnassigned(ctx, code);
    });
    and(/^the event "(.*)" was published with the entity's id$/, (eventName: string) => {
      expectEventWithId(eventName);
    });
  });
});
