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
import { createPlatform, createValueStream } from './rdhy-helpers';
import {
  VamCtx,
  makeVamCtx,
  createVamAgreement,
  getVamAgreement,
  putVamCanvas,
  transitionVamAgreement,
  terminationRuleIds,
  SAMPLE_CANVAS,
} from './vam-helpers';

const feature = loadFeature(
  path.resolve(__dirname, '../../../../../packages/plugin-rdhy/features/vam-lifecycle.feature'),
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
    and(
      /^a VAM agreement titled "(.*)" exists for the value stream "(.*)" sponsored by "(.*)"$/,
      async (title: string, valueStreamCode: string, platformCode: string) => {
        const res = await createVamAgreement(ctx, title, valueStreamCode, platformCode);
        expect(res.status).toBe(201);
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

  function registerCanvasReplacedGiven(step: StepFn) {
    step(
      /^the canvas of the VAM agreement "(.*)" is replaced with the sample canvas$/,
      async (title: string) => {
        const res = await putVamCanvas(ctx, title, SAMPLE_CANVAS);
        expect(res.status).toBe(200);
      },
    );
  }

  function registerStatus(then: StepFn) {
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(Number(status));
    });
  }

  function registerStatusWithDate(and: StepFn, kind: 'start' | 'end') {
    and(
      new RegExp(`^the VAM agreement response has status "(.*)" and a${kind === 'end' ? 'n end' : ' start'} date$`),
      (status: string) => {
        expect(ctx.response.body.status).toBe(status);
        const date = kind === 'start' ? ctx.response.body.startedAt : ctx.response.body.endedAt;
        expect(date).toBeTruthy();
      },
    );
  }

  test('Activating a draft', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(/^I activate the VAM agreement "(.*)"$/, async (title: string) => {
      ctx.response = await transitionVamAgreement(ctx, title, 'activate');
    });
    registerStatus(then);
    registerStatusWithDate(and, 'start');
  });

  test('Only one active agreement per value stream', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerActivatedGiven(given);
    registerAgreementExists(and);
    when(/^I activate the VAM agreement "(.*)"$/, async (title: string) => {
      ctx.response = await transitionVamAgreement(ctx, title, 'activate');
    });
    registerStatus(then);
  });

  test('Activating a non-draft agreement fails', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerActivatedGiven(given);
    when(/^I activate the VAM agreement "(.*)"$/, async (title: string) => {
      ctx.response = await transitionVamAgreement(ctx, title, 'activate');
    });
    registerStatus(then);
  });

  test('Completing an active agreement', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerActivatedGiven(given);
    when(/^I complete the VAM agreement "(.*)"$/, async (title: string) => {
      ctx.response = await transitionVamAgreement(ctx, title, 'complete');
    });
    registerStatus(then);
    registerStatusWithDate(and, 'end');
  });

  test('Completing a draft fails', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(/^I complete the VAM agreement "(.*)"$/, async (title: string) => {
      ctx.response = await transitionVamAgreement(ctx, title, 'complete');
    });
    registerStatus(then);
  });

  test('Terminating an active agreement citing a rule', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerCanvasReplacedGiven(given);
    registerActivatedGiven(and);
    when(
      /^I terminate the VAM agreement "(.*)" citing rule (\d+) with note "(.*)"$/,
      async (title: string, ruleNumber: string, note: string) => {
        const ruleIds = await terminationRuleIds(ctx, title);
        ctx.response = await transitionVamAgreement(ctx, title, 'terminate', {
          citedTerminationConditionId: ruleIds[Number(ruleNumber) - 1],
          note,
        });
      },
    );
    registerStatus(then);
    registerStatusWithDate(and, 'end');
    and(
      /^the VAM agreement "(.*)" termination cites rule (\d+) with note "(.*)"$/,
      async (title: string, ruleNumber: string, note: string) => {
        const res = await getVamAgreement(ctx, title);
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
      /^I terminate the VAM agreement "(.*)" without citing a rule$/,
      async (title: string) => {
        ctx.response = await transitionVamAgreement(ctx, title, 'terminate', {});
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
      /^I terminate the VAM agreement "(.*)" citing a rule of the VAM agreement "(.*)"$/,
      async (title: string, otherTitle: string) => {
        const foreignRuleIds = await terminationRuleIds(ctx, otherTitle);
        ctx.response = await transitionVamAgreement(ctx, title, 'terminate', {
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
    when(
      /^I delete the value stream "(.*)" through the core API$/,
      async (code: string) => {
        ctx.response = await request(getApp().getHttpServer())
          .delete(`/value-streams/${ctx.valueStreams.get(code)}`)
          .set('Cookie', [ctx.authCookie])
          .set('X-CSRF-Protection', '1');
        expect(ctx.response.status).toBe(204);
      },
    );
    and(/^I delete the RDHY platform "(.*)"$/, async (code: string) => {
      ctx.response = await request(getApp().getHttpServer())
        .delete(`/plugins/rdhy/platforms/${ctx.platforms.get(code)}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1');
    });
    registerStatus(then);
  });
});
