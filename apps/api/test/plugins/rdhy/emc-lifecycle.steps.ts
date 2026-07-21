import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { bootstrapApp, cleanDatabase, teardownApp, getApp, createAuthenticatedUser } from '../../setup';
import { createPlatform, createValueStream } from './rdhy-helpers';
import {
  EmcCtx,
  makeEmcCtx,
  createEmcAgreement,
  getEmcAgreement,
  putEmcCanvas,
  transitionEmcAgreement,
  sampleEmcCanvas,
  emcTerminationRuleIds,
} from './emc-helpers';

const feature = loadFeature(
  path.resolve(__dirname, '../../../../../packages/plugin-rdhy/features/emc-lifecycle.feature'),
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
    const valueStreamExists = (step: StepFn) =>
      step(
        /^a value stream exists with code "(.*)" and name "(.*)"$/,
        async (code: string, name: string) => {
          await createValueStream(ctx, code, name);
        },
      );
    valueStreamExists(and);
    valueStreamExists(and);
    valueStreamExists(and);
    registerAgreementExists(and);
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

  function registerCanvasReplacedGiven(step: StepFn) {
    step(
      /^the canvas of the EMC agreement "(.*)" is replaced with the sample canvas$/,
      async (title: string) => {
        const res = await putEmcCanvas(ctx, title, sampleEmcCanvas(ctx));
        expect(res.status).toBe(200);
      },
    );
  }

  function registerActivatedGiven(step: StepFn) {
    step(/^the EMC agreement "(.*)" is activated$/, async (title: string) => {
      const res = await transitionEmcAgreement(ctx, title, 'activate');
      expect(res.status).toBe(200);
    });
  }

  function registerActivateWhen(when: StepFn) {
    when(/^I activate the EMC agreement "(.*)"$/, async (title: string) => {
      ctx.response = await transitionEmcAgreement(ctx, title, 'activate');
    });
  }

  function registerStatus(then: StepFn) {
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(Number(status));
    });
  }

  function registerStatusWithDate(step: StepFn, boundary: 'start' | 'end') {
    step(
      new RegExp(`^the EMC agreement response has status "(.*)" and (?:a|an) ${boundary} date$`),
      (status: string) => {
        expect(ctx.response.body.status).toBe(status);
        const field = boundary === 'start' ? 'startedAt' : 'endedAt';
        expect(ctx.response.body[field]).toEqual(expect.any(String));
      },
    );
  }

  test('Activating a draft', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerActivateWhen(when);
    registerStatus(then);
    registerStatusWithDate(and, 'start');
  });

  test('A value stream may participate in several active EMCs', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerCanvasReplacedGiven(given);
    registerActivatedGiven(and);
    registerAgreementExists(and);
    registerCanvasReplacedGiven(and);
    registerActivateWhen(when);
    registerStatus(then);
    registerStatusWithDate(and, 'start');
  });

  test('Activating a non-draft agreement fails', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerActivatedGiven(given);
    registerActivateWhen(when);
    registerStatus(then);
  });

  test('Completing an active agreement', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerActivatedGiven(given);
    when(/^I complete the EMC agreement "(.*)"$/, async (title: string) => {
      ctx.response = await transitionEmcAgreement(ctx, title, 'complete');
    });
    registerStatus(then);
    registerStatusWithDate(and, 'end');
  });

  test('Completing a draft fails', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(/^I complete the EMC agreement "(.*)"$/, async (title: string) => {
      ctx.response = await transitionEmcAgreement(ctx, title, 'complete');
    });
    registerStatus(then);
  });

  test('Terminating an active agreement citing a rule', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerCanvasReplacedGiven(given);
    registerActivatedGiven(and);
    when(
      /^I terminate the EMC agreement "(.*)" citing rule (\d+) with note "(.*)"$/,
      async (title: string, ruleNumber: string, note: string) => {
        const ruleIds = await emcTerminationRuleIds(ctx, title);
        ctx.response = await transitionEmcAgreement(ctx, title, 'terminate', {
          citedTerminationConditionId: ruleIds[Number(ruleNumber) - 1],
          note,
        });
      },
    );
    registerStatus(then);
    registerStatusWithDate(and, 'end');
    and(
      /^the EMC agreement "(.*)" termination cites rule (\d+) with note "(.*)"$/,
      async (title: string, ruleNumber: string, note: string) => {
        const res = await getEmcAgreement(ctx, title);
        expect(res.status).toBe(200);
        const ruleId = res.body.canvas.terminationConditions[Number(ruleNumber) - 1].id;
        expect(res.body.citedTerminationConditionId).toBe(ruleId);
        expect(res.body.terminationNote).toBe(note);
      },
    );
  });

  test('Terminating without a citation while rules exist fails', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerCanvasReplacedGiven(given);
    registerActivatedGiven(and);
    when(
      /^I terminate the EMC agreement "(.*)" without citing a rule$/,
      async (title: string) => {
        ctx.response = await transitionEmcAgreement(ctx, title, 'terminate', {});
      },
    );
    registerStatus(then);
  });

  test("Terminating citing another agreement's rule fails", ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerCanvasReplacedGiven(given);
    registerActivatedGiven(and);
    registerAgreementExists(and);
    registerCanvasReplacedGiven(and);
    when(
      /^I terminate the EMC agreement "(.*)" citing a rule of the EMC agreement "(.*)"$/,
      async (title: string, otherTitle: string) => {
        const foreignRuleIds = await emcTerminationRuleIds(ctx, otherTitle);
        ctx.response = await transitionEmcAgreement(ctx, title, 'terminate', {
          citedTerminationConditionId: foreignRuleIds[0],
        });
      },
    );
    registerStatus(then);
  });

  test('Platform deletion is blocked while sponsoring agreements', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(/^I delete the RDHY platform "(.*)"$/, async (code: string) => {
      ctx.response = await request(getApp().getHttpServer())
        .delete(`/plugins/rdhy/platforms/${ctx.platforms.get(code)}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1');
    });
    registerStatus(then);
    when(/^I delete the EMC agreement "(.*)"$/, async (title: string) => {
      ctx.response = await request(getApp().getHttpServer())
        .delete(`/plugins/rdhy/emc-agreements/${ctx.agreements.get(title)}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1');
      expect(ctx.response.status).toBe(204);
    });
    and(/^I delete the RDHY platform "(.*)"$/, async (code: string) => {
      ctx.response = await request(getApp().getHttpServer())
        .delete(`/plugins/rdhy/platforms/${ctx.platforms.get(code)}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1');
    });
    registerStatus(then);
  });
});
