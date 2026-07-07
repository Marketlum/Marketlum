import { loadFeature, defineFeature } from 'jest-cucumber';
import * as path from 'path';
import {
  bootstrapApp,
  cleanDatabase,
  teardownApp,
  createAuthenticatedUser,
} from '../../setup';
import { createPlatform, createValueStream } from './rdhy-helpers';
import {
  VamCtx,
  makeVamCtx,
  createVamAgreement,
  putVamCanvas,
  transitionVamAgreement,
  SAMPLE_CANVAS,
  MINIMAL_CANVAS,
} from './vam-helpers';

const feature = loadFeature(
  path.resolve(__dirname, '../../../../../packages/plugin-rdhy/features/vam-canvas.feature'),
);

type StepFn = (regex: RegExp | string, fn: (...args: never[]) => unknown) => void;

const DUPLICATE_OFFSETS_CANVAS = {
  ...MINIMAL_CANVAS,
  milestones: [
    { offsetMonths: 3, label: null, items: [] },
    { offsetMonths: 3, label: null, items: [] },
  ],
};

const BEYOND_HORIZON_CANVAS = {
  ...MINIMAL_CANVAS,
  milestones: [{ offsetMonths: 24, label: null, items: [] }],
};

const INVALID_TRACK_CANVAS = {
  ...MINIMAL_CANVAS,
  milestones: [
    {
      offsetMonths: 3,
      label: null,
      items: [{ track: 'BONUS_TRACK', description: 'Invalid', amount: null }],
    },
  ],
};

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

  function registerStatus(then: StepFn) {
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(Number(status));
    });
  }

  function registerReplaceSample(when: StepFn) {
    when(
      /^I replace the canvas of the VAM agreement "(.*)" with the sample canvas$/,
      async (title: string) => {
        ctx.response = await putVamCanvas(ctx, title, SAMPLE_CANVAS);
      },
    );
  }

  function registerCanvasCounts(and: StepFn) {
    and(
      /^the canvas has (\d+) milestones?, (\d+) grid items?, (\d+) cost entries, (\d+) investment entries and (\d+) termination conditions$/,
      (milestones: string, items: string, costs: string, investments: string, rules: string) => {
        const canvas = ctx.response.body.canvas;
        expect(canvas.milestones).toHaveLength(Number(milestones));
        const itemCount = canvas.milestones.reduce(
          (acc: number, m: { items: unknown[] }) => acc + m.items.length,
          0,
        );
        expect(itemCount).toBe(Number(items));
        expect(canvas.costEntries).toHaveLength(Number(costs));
        expect(canvas.investmentEntries).toHaveLength(Number(investments));
        expect(canvas.terminationConditions).toHaveLength(Number(rules));
      },
    );
  }

  test('Replacing the canvas populates all sections in order', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerReplaceSample(when);
    registerStatus(then);
    registerCanvasCounts(and);
    and(/^the canvas milestones are ordered "(.*)"$/, (expected: string) => {
      const offsets = ctx.response.body.canvas.milestones
        .map((m: { offsetMonths: number }) => m.offsetMonths)
        .join(', ');
      expect(offsets).toBe(expected);
    });
  });

  test('Re-replacing the canvas discards the previous content', ({ given, and, when, then }) => {
    registerBackground(given, and);
    given(
      /^the canvas of the VAM agreement "(.*)" is replaced with the sample canvas$/,
      async (title: string) => {
        const res = await putVamCanvas(ctx, title, SAMPLE_CANVAS);
        expect(res.status).toBe(200);
      },
    );
    when(
      /^I replace the canvas of the VAM agreement "(.*)" with the minimal canvas$/,
      async (title: string) => {
        ctx.response = await putVamCanvas(ctx, title, MINIMAL_CANVAS);
      },
    );
    registerStatus(then);
    registerCanvasCounts(and);
  });

  test('Duplicate milestone offsets are rejected', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(
      /^I replace the canvas of the VAM agreement "(.*)" with a canvas containing duplicate milestone offsets$/,
      async (title: string) => {
        ctx.response = await putVamCanvas(ctx, title, DUPLICATE_OFFSETS_CANVAS);
      },
    );
    registerStatus(then);
  });

  test('Milestone offsets beyond the horizon are rejected', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(
      /^I replace the canvas of the VAM agreement "(.*)" with a canvas containing a milestone at 24 months$/,
      async (title: string) => {
        ctx.response = await putVamCanvas(ctx, title, BEYOND_HORIZON_CANVAS);
      },
    );
    registerStatus(then);
  });

  test('Invalid track values are rejected', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(
      /^I replace the canvas of the VAM agreement "(.*)" with a canvas containing an invalid track$/,
      async (title: string) => {
        ctx.response = await putVamCanvas(ctx, title, INVALID_TRACK_CANVAS);
      },
    );
    registerStatus(then);
  });

  test('Canvas edits are rejected once active', ({ given, and, when, then }) => {
    registerBackground(given, and);
    given(/^the VAM agreement "(.*)" is activated$/, async (title: string) => {
      const res = await transitionVamAgreement(ctx, title, 'activate');
      expect(res.status).toBe(200);
    });
    registerReplaceSample(when);
    registerStatus(then);
  });
});
