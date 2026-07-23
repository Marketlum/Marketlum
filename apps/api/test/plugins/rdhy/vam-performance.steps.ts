import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { addMonths } from '@marketlum/plugin-rdhy';
import {
  bootstrapApp,
  cleanDatabase,
  teardownApp,
  getApp,
  createAuthenticatedUser,
} from '../../setup';
import { createPlatform } from './rdhy-helpers';
import {
  VamCtx,
  makeVamCtx,
  createVamAgreement,
  putVamCanvas,
  transitionVamAgreement,
  MINIMAL_CANVAS,
} from './vam-helpers';

const feature = loadFeature(
  path.resolve(__dirname, '../../../../../packages/plugin-rdhy/features/vam-performance.feature'),
);

/** M3 qualitative-only, M6 two DIRECT tranches (sum 500K) + a reward, M9
 * another 500K (cumulative 1M), M12 equity-only. */
const PERFORMANCE_CANVAS = {
  milestones: [
    {
      offsetMonths: 3,
      label: null,
      items: [{ track: 'DIRECT_VALUE', description: 'All offerings prepared', amount: null }],
    },
    {
      offsetMonths: 6,
      label: null,
      items: [
        { track: 'DIRECT_VALUE', description: 'First tranche of revenues', amount: 250000 },
        { track: 'DIRECT_VALUE', description: 'Second tranche of revenues', amount: 250000 },
        { track: 'VARIABLE_PAY', description: '$50K bonus for owners', amount: 50000 },
      ],
    },
    {
      offsetMonths: 9,
      label: null,
      items: [
        { track: 'DIRECT_VALUE', description: 'Second $500K of revenues', amount: 500000 },
        { track: 'INDIRECT_VALUE', description: 'Network of partners consolidated', amount: null },
      ],
    },
    {
      offsetMonths: 12,
      label: null,
      items: [
        { track: 'EQUITY', description: 'Owners invited to acquire 10% of the equity', amount: null },
      ],
    },
  ],
  costEntries: [],
  investmentEntries: [],
  terminationConditions: [],
};

interface PerfCtx extends VamCtx {
  valueIds: Map<string, string>;
  startDates: Map<string, Date>;
}

const makePerfCtx = (): PerfCtx => ({
  ...makeVamCtx(),
  valueIds: new Map(),
  startDates: new Map(),
});

function server() {
  return getApp().getHttpServer();
}

function dataSource(): DataSource {
  return getApp().get(DataSource);
}

async function ensureValue(ctx: PerfCtx, name: string): Promise<void> {
  if (ctx.valueIds.has(name)) return;
  const res = await request(server())
    .post('/values')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'currency', purpose: `Test currency ${name}` });
  expect(res.status).toBe(201);
  ctx.valueIds.set(name, res.body.id);
}

async function createAgentWithCurrency(
  ctx: PerfCtx,
  name: string,
  currencyName: string,
): Promise<void> {
  const res = await request(server())
    .post('/agents')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'organization', functionalCurrencyId: ctx.valueIds.get(currencyName) });
  expect(res.status).toBe(201);
  ctx.agents.set(name, res.body.id);
}

/** Activate through the API, then backdate startedAt so milestones fall in the past. */
async function activateBackdated(ctx: PerfCtx, title: string, monthsAgo: number): Promise<void> {
  const res = await transitionVamAgreement(ctx, title, 'activate');
  expect(res.status).toBe(200);
  const startedAt = addMonths(new Date(), -monthsAgo);
  await dataSource().query(
    'UPDATE plugin_rdhy_vam_agreements SET "startedAt" = $1 WHERE id = $2',
    [startedAt, ctx.agreements.get(title)],
  );
  ctx.startDates.set(title, startedAt);
}

/** Terminate through the API, then pin endedAt relative to the backdated start. */
async function terminateWithEnd(
  ctx: PerfCtx,
  title: string,
  monthsAfterStart: number,
): Promise<void> {
  const res = await transitionVamAgreement(ctx, title, 'terminate', {});
  expect(res.status).toBe(200);
  const endedAt = addMonths(ctx.startDates.get(title)!, monthsAfterStart);
  await dataSource().query('UPDATE plugin_rdhy_vam_agreements SET "endedAt" = $1 WHERE id = $2', [
    endedAt,
    ctx.agreements.get(title),
  ]);
}

let invoiceSeq = 0;

async function createInvoice(
  ctx: PerfCtx,
  args: {
    from: string;
    to: string;
    currencyName: string;
    agreementTitle: string;
    monthsAfterStart: number;
    amount: string;
  },
): Promise<void> {
  const issuedAt = addMonths(ctx.startDates.get(args.agreementTitle)!, args.monthsAfterStart);
  invoiceSeq += 1;
  const res = await request(server())
    .post('/invoices')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({
      number: `PERF-${Date.now()}-${invoiceSeq}`,
      fromAgentId: ctx.agents.get(args.from),
      toAgentId: ctx.agents.get(args.to),
      currencyId: ctx.valueIds.get(args.currencyName),
      issuedAt: issuedAt.toISOString(),
      dueAt: issuedAt.toISOString(),
      paid: false,
      items: [{ quantity: '1.00', unitPrice: args.amount, total: args.amount }],
    });
  expect(res.status).toBe(201);
}

async function fetchPerformance(ctx: PerfCtx, title: string | null): Promise<request.Response> {
  const id = title === null ? '00000000-0000-0000-0000-000000000000' : ctx.agreements.get(title);
  return request(server())
    .get(`/plugins/rdhy/vam-agreements/${id}/performance`)
    .set('Cookie', [ctx.authCookie]);
}

function milestoneAt(ctx: PerfCtx, offsetMonths: number) {
  const milestone = ctx.response.body.milestones.find(
    (m: { offsetMonths: number }) => m.offsetMonths === offsetMonths,
  );
  expect(milestone).toBeDefined();
  return milestone;
}

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

  const ctx: PerfCtx = makePerfCtx();
  beforeEach(() => {
    Object.assign(ctx, makePerfCtx());
  });

  function registerBackground(given: StepFn, and: StepFn) {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      ctx.authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a currency value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(ctx, name);
    });
    and(
      /^an RDHY platform exists with code "(.*)" and name "(.*)"$/,
      async (code: string, name: string) => {
        await createPlatform(ctx, code, name);
      },
    );
    const agentStep = (step: StepFn) =>
      step(
        /^an agent exists with name "(.*)" and functional currency "(.*)"$/,
        async (name: string, currency: string) => {
          await createAgentWithCurrency(ctx, name, currency);
        },
      );
    agentStep(and);
    agentStep(and);
    registerAgreementInCurrency(and);
    registerPerformanceCanvas(and);
  }

  function registerAgreementInCurrency(step: StepFn) {
    step(
      /^a VAM agreement titled "(.*)" in currency "(.*)" exists for the agent "(.*)" sponsored by "(.*)"$/,
      async (title: string, currency: string, agentName: string, platformCode: string) => {
        const res = await createVamAgreement(
          ctx,
          title,
          agentName,
          platformCode,
          12,
          ctx.valueIds.get(currency),
        );
        expect(res.status).toBe(201);
      },
    );
  }

  function registerPerformanceCanvas(step: StepFn) {
    step(
      /^the canvas of the VAM agreement "(.*)" is replaced with the performance canvas$/,
      async (title: string) => {
        const res = await putVamCanvas(ctx, title, PERFORMANCE_CANVAS);
        expect(res.status).toBe(200);
      },
    );
  }

  function registerBackdatedActivation(step: StepFn) {
    step(
      /^the VAM agreement "(.*)" is activated with a start date (\d+) months ago$/,
      async (title: string, monthsAgo: string) => {
        await activateBackdated(ctx, title, Number(monthsAgo));
      },
    );
  }

  function registerCurrencyValue(step: StepFn) {
    step(/^a currency value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(ctx, name);
    });
  }

  function registerInvoice(step: StepFn) {
    step(
      /^an invoice exists from "(.*)" to "(.*)" issued (\d+) months after the start of "(.*)" amount "(.*)"$/,
      async (from: string, to: string, months: string, title: string, amount: string) => {
        await createInvoice(ctx, {
          from,
          to,
          currencyName: 'USD',
          agreementTitle: title,
          monthsAfterStart: Number(months),
          amount,
        });
      },
    );
  }

  function registerInvoiceInCurrency(step: StepFn) {
    step(
      /^an invoice exists from "(.*)" to "(.*)" in "(.*)" issued (\d+) months after the start of "(.*)" amount "(.*)"$/,
      async (
        from: string,
        to: string,
        currency: string,
        months: string,
        title: string,
        amount: string,
      ) => {
        await createInvoice(ctx, {
          from,
          to,
          currencyName: currency,
          agreementTitle: title,
          monthsAfterStart: Number(months),
          amount,
        });
      },
    );
  }

  function registerRequest(when: StepFn) {
    when(/^I request the performance of the VAM agreement "(.*)"$/, async (title: string) => {
      ctx.response = await fetchPerformance(ctx, title);
    });
  }

  function registerStatus(then: StepFn) {
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(Number(status));
    });
  }

  function registerComparability(step: StepFn) {
    step(/^the performance comparability is "(.*)"$/, (comparability: string) => {
      expect(ctx.response.body.comparability).toBe(comparability);
    });
  }

  function registerTargetNoStatus(step: StepFn) {
    step(
      /^the performance milestone at month (\d+) has cumulative target "(.*)" and no status$/,
      (offset: string, target: string) => {
        const milestone = milestoneAt(ctx, Number(offset));
        expect(milestone.targetCumulative).toBe(target);
        expect(milestone.status).toBeNull();
      },
    );
  }

  function registerTargetAndStatus(step: StepFn) {
    step(
      /^the performance milestone at month (\d+) has cumulative target "(.*)" and status "(.*)"$/,
      (offset: string, target: string, status: string) => {
        const milestone = milestoneAt(ctx, Number(offset));
        expect(milestone.targetCumulative).toBe(target);
        expect(milestone.status).toBe(status);
      },
    );
  }

  function registerActualAndAttainment(step: StepFn) {
    step(
      /^the performance milestone at month (\d+) has cumulative actual "(.*)" and attainment (\d+)$/,
      (offset: string, actual: string, attainment: string) => {
        const milestone = milestoneAt(ctx, Number(offset));
        expect(milestone.actualCumulative).toBe(actual);
        expect(milestone.attainmentPct).toBe(Number(attainment));
      },
    );
  }

  function registerOverallStatus(step: StepFn) {
    step(/^the performance overall status is "(.*)"$/, (status: string) => {
      expect(ctx.response.body.summary.overallStatus).toBe(status);
    });
  }

  function registerCounts(step: StepFn) {
    step(
      /^the performance invoice count is (\d+) and not converted count is (\d+)$/,
      (invoices: string, notConverted: string) => {
        expect(ctx.response.body.invoiceCount).toBe(Number(invoices));
        expect(ctx.response.body.notConvertedCount).toBe(Number(notConverted));
      },
    );
  }

  function registerMonthlyActuals(step: StepFn) {
    step(
      /^the performance monthly actuals have (\d+) entries with final cumulative "(.*)"$/,
      (count: string, cumulative: string) => {
        const series = ctx.response.body.monthlyActuals;
        expect(series).toHaveLength(Number(count));
        expect(series[series.length - 1].cumulative).toBe(cumulative);
      },
    );
  }

  test('Plan versus actual for a comparable agreement', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerBackdatedActivation(given);
    registerCurrencyValue(and);
    registerInvoice(and);
    registerInvoice(and);
    registerInvoice(and);
    registerInvoiceInCurrency(and);
    registerRequest(when);
    registerStatus(then);
    registerComparability(and);
    registerTargetNoStatus(and);
    registerTargetAndStatus(and);
    registerActualAndAttainment(and);
    registerTargetAndStatus(and);
    registerActualAndAttainment(and);
    registerTargetAndStatus(and);
    registerOverallStatus(and);
    registerCounts(and);
    registerMonthlyActuals(and);
  });

  test('A past milestone with enough revenue is achieved', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerBackdatedActivation(given);
    registerInvoice(and);
    registerRequest(when);
    registerStatus(then);
    registerTargetAndStatus(and);
    registerActualAndAttainment(and);
  });

  test('A missed milestone is not rescued by revenue after the window', ({
    given,
    and,
    when,
    then,
  }) => {
    registerBackground(given, and);
    registerBackdatedActivation(given);
    registerInvoice(and);
    registerInvoice(and);
    and(
      /^the VAM agreement "(.*)" is terminated with an end date (\d+) months after its start$/,
      async (title: string, months: string) => {
        await terminateWithEnd(ctx, title, Number(months));
      },
    );
    registerRequest(when);
    registerStatus(then);
    registerTargetAndStatus(and);
    registerActualAndAttainment(and);
    registerTargetAndStatus(and);
    and(
      /^the performance summary shows target "(.*)" actual "(.*)" attainment (\d+) and overall status "(.*)"$/,
      (target: string, actual: string, attainment: string, status: string) => {
        expect(ctx.response.body.summary.targetToDate).toBe(target);
        expect(ctx.response.body.summary.actualToDate).toBe(actual);
        expect(ctx.response.body.summary.attainmentPct).toBe(Number(attainment));
        expect(ctx.response.body.summary.overallStatus).toBe(status);
      },
    );
  });

  test('The current milestone is on track against the pro-rata target', ({
    given,
    and,
    when,
    then,
  }) => {
    registerBackground(given, and);
    registerBackdatedActivation(given);
    registerInvoice(and);
    registerRequest(when);
    registerStatus(then);
    registerTargetAndStatus(and);
    registerActualAndAttainment(and);
    registerOverallStatus(and);
  });

  test('The current milestone falls behind the pro-rata target', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerBackdatedActivation(given);
    registerInvoice(and);
    registerRequest(when);
    registerStatus(then);
    registerTargetAndStatus(and);
    registerActualAndAttainment(and);
  });

  test('Future milestones are upcoming and qualitative milestones are not judged', ({
    given,
    and,
    when,
    then,
  }) => {
    registerBackground(given, and);
    registerBackdatedActivation(given);
    registerRequest(when);
    registerStatus(then);
    registerTargetNoStatus(and);
    registerTargetAndStatus(and);
    registerTargetAndStatus(and);
    registerTargetAndStatus(and);
  });

  test('Mismatched currencies disable judgments but keep actuals', ({
    given,
    and,
    when,
    then,
  }) => {
    registerBackground(given, and);
    registerCurrencyValue(given);
    registerAgreementInCurrency(and);
    registerPerformanceCanvas(and);
    registerBackdatedActivation(and);
    registerInvoice(and);
    registerRequest(when);
    registerStatus(then);
    registerComparability(and);
    registerTargetNoStatus(and);
    registerMonthlyActuals(and);
  });

  test('A canvas without revenue amounts is not measurable', ({ given, and, when, then }) => {
    registerBackground(given, and);
    given(
      /^the canvas of the VAM agreement "(.*)" is replaced with the minimal canvas$/,
      async (title: string) => {
        const res = await putVamCanvas(ctx, title, MINIMAL_CANVAS);
        expect(res.status).toBe(200);
      },
    );
    registerBackdatedActivation(and);
    registerRequest(when);
    registerStatus(then);
    registerComparability(and);
    registerTargetNoStatus(and);
  });

  test('Performance is unavailable for drafts and unknown agreements', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerRequest(when);
    registerStatus(then);
    when(/^I request the performance of an unknown VAM agreement$/, async () => {
      ctx.response = await fetchPerformance(ctx, null);
    });
    registerStatus(then);
  });
});
