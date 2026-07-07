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
import { expectEventWithId } from '../../events/event-steps';
import { createPlatform, createValueStream } from './rdhy-helpers';
import {
  VamCtx,
  makeVamCtx,
  createVamAgreement,
  transitionVamAgreement,
} from './vam-helpers';

const feature = loadFeature(
  path.resolve(__dirname, '../../../../../packages/plugin-rdhy/features/vam-agreements.feature'),
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

  const ctx: VamCtx = makeVamCtx();
  beforeEach(() => {
    Object.assign(ctx, makeVamCtx());
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
      /^a value stream exists with code "(.*)" and name "(.*)"$/,
      async (code: string, name: string) => {
        await createValueStream(ctx, code, name);
      },
    );
  }

  function registerAgreementExists(step: StepFn) {
    step(
      /^a VAM agreement titled "(.*)" exists for the value stream "(.*)" sponsored by "(.*)"$/,
      async (title: string, valueStreamCode: string, platformCode: string) => {
        const res = await createVamAgreement(ctx, title, valueStreamCode, platformCode);
        expect(res.status).toBe(201);
      },
    );
  }

  function registerActivatedGiven(step: StepFn) {
    step(/^the VAM agreement "(.*)" is activated$/, async (title: string) => {
      const res = await transitionVamAgreement(ctx, title, 'activate');
      expect(res.status).toBe(200);
    });
  }

  function registerStatus(then: StepFn) {
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(Number(status));
    });
  }

  function registerCreate(when: StepFn) {
    when(
      /^I create a VAM agreement titled "(.*)" for the value stream "(.*)" sponsored by "(.*)" over (\d+) months$/,
      async (title: string, valueStreamCode: string, platformCode: string, months: string) => {
        ctx.response = await createVamAgreement(
          ctx,
          title,
          valueStreamCode,
          platformCode,
          Number(months),
        );
      },
    );
  }

  function registerTitleAndStatus(step: StepFn) {
    step(
      /^the VAM agreement response has title "(.*)" and status "(.*)"$/,
      (title: string, status: string) => {
        expect(ctx.response.body.title).toBe(title);
        expect(ctx.response.body.status).toBe(status);
      },
    );
  }

  test('Creating a draft VAM agreement', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerCreate(when);
    registerStatus(then);
    registerTitleAndStatus(and);
    and(/^the event "(.*)" was published with the new entity's id$/, (eventName: string) => {
      expectEventWithId(eventName);
    });
  });

  test('Creating a VAM agreement for an unknown value stream fails', ({
    given,
    and,
    when,
    then,
  }) => {
    registerBackground(given, and);
    when(
      /^I create a VAM agreement titled "(.*)" for an unknown value stream sponsored by "(.*)" over (\d+) months$/,
      async (title: string, platformCode: string, months: string) => {
        ctx.response = await request(getApp().getHttpServer())
          .post('/plugins/rdhy/vam-agreements')
          .set('Cookie', [ctx.authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            title,
            valueStreamId: randomUUID(),
            platformId: ctx.platforms.get(platformCode),
            horizonMonths: Number(months),
          });
      },
    );
    registerStatus(then);
  });

  test('Creating a VAM agreement with an unknown sponsor platform fails', ({
    given,
    and,
    when,
    then,
  }) => {
    registerBackground(given, and);
    when(
      /^I create a VAM agreement titled "(.*)" for the value stream "(.*)" sponsored by an unknown platform over (\d+) months$/,
      async (title: string, valueStreamCode: string, months: string) => {
        ctx.response = await request(getApp().getHttpServer())
          .post('/plugins/rdhy/vam-agreements')
          .set('Cookie', [ctx.authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            title,
            valueStreamId: ctx.valueStreams.get(valueStreamCode),
            platformId: randomUUID(),
            horizonMonths: Number(months),
          });
      },
    );
    registerStatus(then);
  });

  test('Rejecting an invalid horizon', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerCreate(when);
    registerStatus(then);
  });

  test('Listing VAM agreements with summaries', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerAgreementExists(given);
    registerAgreementExists(and);
    when(/^I list VAM agreements$/, async () => {
      ctx.response = await request(getApp().getHttpServer())
        .get('/plugins/rdhy/vam-agreements')
        .set('Cookie', [ctx.authCookie]);
    });
    registerStatus(then);
    const listContains = (step: StepFn) =>
      step(
        /^the VAM agreement list contains "(.*)" with value stream "(.*)" and platform "(.*)"$/,
        (title: string, valueStreamCode: string, platformCode: string) => {
          const entry = ctx.response.body.find((a: { title: string }) => a.title === title);
          expect(entry).toBeDefined();
          expect(entry.valueStream.code).toBe(valueStreamCode);
          expect(entry.platform.code).toBe(platformCode);
        },
      );
    listContains(and);
    listContains(and);
  });

  test('Updating metadata while in draft', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerAgreementExists(given);
    when(
      /^I update the VAM agreement "(.*)" with title "(.*)"$/,
      async (title: string, newTitle: string) => {
        ctx.response = await request(getApp().getHttpServer())
          .patch(`/plugins/rdhy/vam-agreements/${ctx.agreements.get(title)}`)
          .set('Cookie', [ctx.authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ title: newTitle });
      },
    );
    registerStatus(then);
    registerTitleAndStatus(and);
    and(/^the event "(.*)" was published with the entity's id$/, (eventName: string) => {
      expectEventWithId(eventName);
    });
  });

  test('Metadata updates are rejected once active', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerAgreementExists(given);
    registerActivatedGiven(and);
    when(
      /^I update the VAM agreement "(.*)" with title "(.*)"$/,
      async (title: string, newTitle: string) => {
        ctx.response = await request(getApp().getHttpServer())
          .patch(`/plugins/rdhy/vam-agreements/${ctx.agreements.get(title)}`)
          .set('Cookie', [ctx.authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ title: newTitle });
      },
    );
    registerStatus(then);
  });

  test('Deleting a draft VAM agreement', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerAgreementExists(given);
    when(/^I delete the VAM agreement "(.*)"$/, async (title: string) => {
      ctx.response = await request(getApp().getHttpServer())
        .delete(`/plugins/rdhy/vam-agreements/${ctx.agreements.get(title)}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1');
    });
    registerStatus(then);
    and(/^the event "(.*)" was published with the entity's id$/, (eventName: string) => {
      expectEventWithId(eventName);
    });
  });

  test('Deleting an active VAM agreement is rejected', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerAgreementExists(given);
    registerActivatedGiven(and);
    when(/^I delete the VAM agreement "(.*)"$/, async (title: string) => {
      ctx.response = await request(getApp().getHttpServer())
        .delete(`/plugins/rdhy/vam-agreements/${ctx.agreements.get(title)}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1');
    });
    registerStatus(then);
  });
});
