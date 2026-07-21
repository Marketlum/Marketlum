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
import { createPlatform } from './rdhy-helpers';
import {
  EmcCtx,
  makeEmcCtx,
  createEmcAgreement,
  patchEmcAgreement,
  transitionEmcAgreement,
} from './emc-helpers';

const feature = loadFeature(
  path.resolve(__dirname, '../../../../../packages/plugin-rdhy/features/emc-agreements.feature'),
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

  const ctx: EmcCtx = makeEmcCtx();
  beforeEach(() => {
    Object.assign(ctx, makeEmcCtx());
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
  }

  function registerAgreementExists(step: StepFn) {
    step(
      /^an EMC agreement titled "(.*)" exists sponsored by "(.*)"$/,
      async (title: string, platformCode: string) => {
        const res = await createEmcAgreement(ctx, title, platformCode);
        expect(res.status).toBe(201);
      },
    );
  }

  function registerActivatedGiven(step: StepFn) {
    step(/^the EMC agreement "(.*)" is activated$/, async (title: string) => {
      const res = await transitionEmcAgreement(ctx, title, 'activate');
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
      /^I create an EMC agreement titled "(.*)" sponsored by "(.*)" with a reinvestment share of (\d+) percent$/,
      async (title: string, platformCode: string, percent: string) => {
        ctx.response = await createEmcAgreement(ctx, title, platformCode, Number(percent));
      },
    );
  }

  function registerTitleAndStatus(step: StepFn) {
    step(
      /^the EMC agreement response has title "(.*)" and status "(.*)"$/,
      (title: string, status: string) => {
        expect(ctx.response.body.title).toBe(title);
        expect(ctx.response.body.status).toBe(status);
      },
    );
  }

  test('Creating a draft EMC agreement', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerCreate(when);
    registerStatus(then);
    registerTitleAndStatus(and);
    and(
      /^the EMC agreement response has a reinvestment share of (\d+) percent$/,
      (percent: string) => {
        expect(Number(ctx.response.body.reinvestmentPercent)).toBe(Number(percent));
      },
    );
    and(/^the event "(.*)" was published with the new entity's id$/, (eventName: string) => {
      expectEventWithId(eventName);
    });
  });

  test('Creating an EMC agreement with an unknown sponsor platform fails', ({
    given,
    and,
    when,
    then,
  }) => {
    registerBackground(given, and);
    when(
      /^I create an EMC agreement titled "(.*)" sponsored by an unknown platform with a reinvestment share of (\d+) percent$/,
      async (title: string, percent: string) => {
        ctx.response = await request(getApp().getHttpServer())
          .post('/plugins/rdhy/emc-agreements')
          .set('Cookie', [ctx.authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ title, platformId: randomUUID(), reinvestmentPercent: Number(percent) });
      },
    );
    registerStatus(then);
  });

  test('Rejecting an invalid reinvestment share', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerCreate(when);
    registerStatus(then);
  });

  test('Listing EMC agreements with summaries', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerAgreementExists(given);
    registerAgreementExists(and);
    when(/^I list EMC agreements$/, async () => {
      ctx.response = await request(getApp().getHttpServer())
        .get('/plugins/rdhy/emc-agreements')
        .set('Cookie', [ctx.authCookie]);
    });
    registerStatus(then);
    const listContains = (step: StepFn) =>
      step(
        /^the EMC agreement list contains "(.*)" with platform "(.*)"$/,
        (title: string, platformCode: string) => {
          const entry = ctx.response.body.find((a: { title: string }) => a.title === title);
          expect(entry).toBeDefined();
          expect(entry.platform.code).toBe(platformCode);
        },
      );
    listContains(and);
    listContains(and);
  });

  test('Updating the EMC setting while in draft', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerAgreementExists(given);
    when(
      /^I update the EMC agreement "(.*)" with collaborative scenario "(.*)"$/,
      async (title: string, scenario: string) => {
        ctx.response = await patchEmcAgreement(ctx, title, { collaborativeScenario: scenario });
      },
    );
    registerStatus(then);
    and(
      /^the EMC agreement response has collaborative scenario "(.*)"$/,
      (scenario: string) => {
        expect(ctx.response.body.collaborativeScenario).toBe(scenario);
      },
    );
    and(/^the event "(.*)" was published with the entity's id$/, (eventName: string) => {
      expectEventWithId(eventName);
    });
  });

  test('Setting updates are rejected once active', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerAgreementExists(given);
    registerActivatedGiven(and);
    when(
      /^I update the EMC agreement "(.*)" with collaborative scenario "(.*)"$/,
      async (title: string, scenario: string) => {
        ctx.response = await patchEmcAgreement(ctx, title, { collaborativeScenario: scenario });
      },
    );
    registerStatus(then);
  });

  test('Deleting a draft EMC agreement', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerAgreementExists(given);
    when(/^I delete the EMC agreement "(.*)"$/, async (title: string) => {
      ctx.response = await request(getApp().getHttpServer())
        .delete(`/plugins/rdhy/emc-agreements/${ctx.agreements.get(title)}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1');
    });
    registerStatus(then);
    and(/^the event "(.*)" was published with the entity's id$/, (eventName: string) => {
      expectEventWithId(eventName);
    });
  });

  test('Deleting an active EMC agreement is rejected', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerAgreementExists(given);
    registerActivatedGiven(and);
    when(/^I delete the EMC agreement "(.*)"$/, async (title: string) => {
      ctx.response = await request(getApp().getHttpServer())
        .delete(`/plugins/rdhy/emc-agreements/${ctx.agreements.get(title)}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1');
    });
    registerStatus(then);
  });
});
