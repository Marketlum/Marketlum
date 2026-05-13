import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import {
  bootstrapApp,
  cleanDatabase,
  teardownApp,
  getApp,
  createAuthenticatedUser,
} from '../setup';

const feature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/value-stream-budget/budget.feature'),
);

interface Ctx {
  authCookie: string;
  valueIds: Map<string, string>;
  valueStreamIds: Map<string, string>;
  counterpartyAgentId: string;
  response: request.Response;
}

async function ensureValue(ctx: Ctx, name: string): Promise<string> {
  if (ctx.valueIds.has(name)) return ctx.valueIds.get(name)!;
  const res = await request(getApp().getHttpServer())
    .post('/values')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'product', purpose: `Test value ${name}` });
  ctx.valueIds.set(name, res.body.id);
  return res.body.id;
}

async function ensureValueStream(
  ctx: Ctx,
  name: string,
  parentName?: string,
): Promise<string> {
  if (ctx.valueStreamIds.has(name)) return ctx.valueStreamIds.get(name)!;
  const body: Record<string, unknown> = { name };
  if (parentName) body.parentId = ctx.valueStreamIds.get(parentName);
  const res = await request(getApp().getHttpServer())
    .post('/value-streams')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
  ctx.valueStreamIds.set(name, res.body.id);
  return res.body.id;
}

async function ensureAgent(ctx: Ctx): Promise<string> {
  if (ctx.counterpartyAgentId) return ctx.counterpartyAgentId;
  const res = await request(getApp().getHttpServer())
    .post('/agents')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name: 'Counterparty', type: 'organization' });
  ctx.counterpartyAgentId = res.body.id;
  return res.body.id;
}

async function setBaseValue(ctx: Ctx, name: string) {
  await request(getApp().getHttpServer())
    .put('/system-settings/base-value')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ baseValueId: ctx.valueIds.get(name)! });
}

async function clearBaseValue(ctx: Ctx) {
  await request(getApp().getHttpServer())
    .put('/system-settings/base-value')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ baseValueId: null });
}

async function createRate(
  ctx: Ctx,
  fromName: string,
  toName: string,
  rate: string,
) {
  return request(getApp().getHttpServer())
    .post('/exchange-rates')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({
      fromValueId: ctx.valueIds.get(fromName),
      toValueId: ctx.valueIds.get(toName),
      rate,
      effectiveAt: new Date().toISOString(),
    });
}

async function createFlow(
  ctx: Ctx,
  args: {
    valueStream: string;
    valueName: string;
    direction: 'inbound' | 'outbound';
    amount: string;
    frequency: string;
    startDate: string;
    endDate?: string;
    status: 'draft' | 'active';
  },
): Promise<string> {
  const valueStreamId = ctx.valueStreamIds.get(args.valueStream)!;
  const counterpartyAgentId = await ensureAgent(ctx);
  const createRes = await request(getApp().getHttpServer())
    .post('/recurring-flows')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({
      valueStreamId,
      counterpartyAgentId,
      currencyId: ctx.valueIds.get(args.valueName),
      direction: args.direction,
      amount: args.amount,
      frequency: args.frequency,
      interval: 1,
      startDate: args.startDate,
      ...(args.endDate ? { endDate: args.endDate } : {}),
    });
  if (args.status === 'active') {
    await request(getApp().getHttpServer())
      .post(`/recurring-flows/${createRes.body.id}/transitions`)
      .set('Cookie', [ctx.authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ action: 'activate' });
  }
  return createRes.body.id;
}

async function fetchBudget(
  ctx: Ctx,
  streamName: string,
  year: number,
  options: { directOnly?: boolean; authenticated?: boolean } = {},
): Promise<request.Response> {
  const directOnly = options.directOnly ?? false;
  const authenticated = options.authenticated ?? true;
  const streamId = ctx.valueStreamIds.get(streamName)!;
  const url = `/value-streams/${streamId}/budget?year=${year}&directOnly=${directOnly}`;
  const req = request(getApp().getHttpServer()).get(url);
  if (authenticated) req.set('Cookie', [ctx.authCookie]);
  return req;
}

function makeCtx(): Ctx {
  return {
    authCookie: '',
    valueIds: new Map(),
    valueStreamIds: new Map(),
    counterpartyAgentId: '',
    response: {} as request.Response,
  };
}

function registerBackground(
  ctx: Ctx,
  steps: {
    given: (regex: RegExp | string, fn: (...args: never[]) => unknown) => void;
    and: (regex: RegExp | string, fn: (...args: never[]) => unknown) => void;
  },
) {
  steps.given(/^I am authenticated as "(.*)"$/, async (email: string) => {
    ctx.authCookie = await createAuthenticatedUser(email, 'password123');
  });
  steps.and(/^a value exists named "(.*)"$/, async (name: string) => {
    await ensureValue(ctx, name);
  });
  steps.and(/^a value exists named "(.*)"$/, async (name: string) => {
    await ensureValue(ctx, name);
  });
  steps.and(/^the system base value is "(.*)"$/, async (name: string) => {
    await setBaseValue(ctx, name);
  });
  steps.and(
    /^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)"$/,
    async (from: string, to: string, rate: string) => {
      await createRate(ctx, from, to, rate);
    },
  );
  steps.and(/^a value stream exists named "(.*)"$/, async (name: string) => {
    await ensureValueStream(ctx, name);
  });
}

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

  test('Empty stream returns zero totals', ({ given, when, then, and }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    when(/^I request the budget for "(.*)" for year (\d+)$/, async (name: string, year: string) => {
      ctx.response = await fetchBudget(ctx, name, parseInt(year, 10));
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the budget activeFlowCount should be (\d+)$/, (count: string) => {
      expect(ctx.response.body.activeFlowCount).toBe(parseInt(count));
    });
    and(/^the budget annual revenue should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.summary.revenue.annual).toBe(v);
    });
    and(/^the budget annual expense should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.summary.expense.annual).toBe(v);
    });
  });

  test('Inactive flows are excluded', ({ given, when, then, and }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^a draft recurring flow exists on "(.*)" with value "(.*)" amount "(.*)" frequency "(.*)" starting "(.*)"$/,
      async (stream: string, value: string, amount: string, frequency: string, start: string) => {
        await createFlow(ctx, {
          valueStream: stream, valueName: value, direction: 'inbound',
          amount, frequency, startDate: start, status: 'draft',
        });
      });
    when(/^I request the budget for "(.*)" for year (\d+)$/, async (name: string, year: string) => {
      ctx.response = await fetchBudget(ctx, name, parseInt(year, 10));
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the budget activeFlowCount should be (\d+)$/, (count: string) => {
      expect(ctx.response.body.activeFlowCount).toBe(parseInt(count));
    });
    and(/^the budget annual revenue should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.summary.revenue.annual).toBe(v);
    });
  });

  test('Active monthly inbound flow contributes for every month in range', ({ given, when, then, and }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^an active recurring flow exists on "(.*)" with value "(.*)" direction "(.*)" amount "(.*)" frequency "(.*)" starting "(.*)"$/,
      async (stream: string, value: string, direction: string, amount: string, frequency: string, start: string) => {
        await createFlow(ctx, {
          valueStream: stream, valueName: value, direction: direction as 'inbound' | 'outbound',
          amount, frequency, startDate: start, status: 'active',
        });
      });
    when(/^I request the budget for "(.*)" for year (\d+)$/, async (name: string, year: string) => {
      ctx.response = await fetchBudget(ctx, name, parseInt(year, 10));
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the budget annual revenue should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.summary.revenue.annual).toBe(v);
    });
    and(/^the budget monthly revenue should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.summary.revenue.monthly).toBe(v);
    });
    and(/^the budget quarterly revenue should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.summary.revenue.quarterly).toBe(v);
    });
  });

  test('startDate clips contribution', ({ given, when, then, and }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^an active recurring flow exists on "(.*)" with value "(.*)" direction "(.*)" amount "(.*)" frequency "(.*)" starting "(.*)"$/,
      async (stream: string, value: string, direction: string, amount: string, frequency: string, start: string) => {
        await createFlow(ctx, {
          valueStream: stream, valueName: value, direction: direction as 'inbound' | 'outbound',
          amount, frequency, startDate: start, status: 'active',
        });
      });
    when(/^I request the budget for "(.*)" for year (\d+)$/, async (name: string, year: string) => {
      ctx.response = await fetchBudget(ctx, name, parseInt(year, 10));
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the budget annual revenue should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.summary.revenue.annual).toBe(v);
    });
  });

  test('endDate clips contribution', ({ given, when, then, and }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^an active recurring flow exists on "(.*)" with value "(.*)" direction "(.*)" amount "(.*)" frequency "(.*)" starting "(.*)" ending "(.*)"$/,
      async (stream: string, value: string, direction: string, amount: string, frequency: string, start: string, end: string) => {
        await createFlow(ctx, {
          valueStream: stream, valueName: value, direction: direction as 'inbound' | 'outbound',
          amount, frequency, startDate: start, endDate: end, status: 'active',
        });
      });
    when(/^I request the budget for "(.*)" for year (\d+)$/, async (name: string, year: string) => {
      ctx.response = await fetchBudget(ctx, name, parseInt(year, 10));
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the budget annual revenue should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.summary.revenue.annual).toBe(v);
    });
  });

  test('Direct-only excludes descendant flows', ({ given, when, then, and }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^a child value stream "(.*)" exists under "(.*)"$/, async (child: string, parent: string) => {
      await ensureValueStream(ctx, child, parent);
    });
    and(/^an active recurring flow exists on "(.*)" with value "(.*)" direction "(.*)" amount "(.*)" frequency "(.*)" starting "(.*)"$/,
      async (stream: string, value: string, direction: string, amount: string, frequency: string, start: string) => {
        await createFlow(ctx, {
          valueStream: stream, valueName: value, direction: direction as 'inbound' | 'outbound',
          amount, frequency, startDate: start, status: 'active',
        });
      });
    when(/^I request the budget for "(.*)" for year (\d+) with directOnly true$/,
      async (name: string, year: string) => {
        ctx.response = await fetchBudget(ctx, name, parseInt(year, 10), { directOnly: true });
      });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the budget annual revenue should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.summary.revenue.annual).toBe(v);
    });
  });

  test('Subtree mode includes descendant flows', ({ given, when, then, and }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^a child value stream "(.*)" exists under "(.*)"$/, async (child: string, parent: string) => {
      await ensureValueStream(ctx, child, parent);
    });
    and(/^an active recurring flow exists on "(.*)" with value "(.*)" direction "(.*)" amount "(.*)" frequency "(.*)" starting "(.*)"$/,
      async (stream: string, value: string, direction: string, amount: string, frequency: string, start: string) => {
        await createFlow(ctx, {
          valueStream: stream, valueName: value, direction: direction as 'inbound' | 'outbound',
          amount, frequency, startDate: start, status: 'active',
        });
      });
    when(/^I request the budget for "(.*)" for year (\d+)$/, async (name: string, year: string) => {
      ctx.response = await fetchBudget(ctx, name, parseInt(year, 10));
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the budget annual revenue should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.summary.revenue.annual).toBe(v);
    });
  });

  test('Year selector picks correct months', ({ given, when, then, and }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^an active recurring flow exists on "(.*)" with value "(.*)" direction "(.*)" amount "(.*)" frequency "(.*)" starting "(.*)" ending "(.*)"$/,
      async (stream: string, value: string, direction: string, amount: string, frequency: string, start: string, end: string) => {
        await createFlow(ctx, {
          valueStream: stream, valueName: value, direction: direction as 'inbound' | 'outbound',
          amount, frequency, startDate: start, endDate: end, status: 'active',
        });
      });
    when(/^I request the budget for "(.*)" for year (\d+)$/, async (name: string, year: string) => {
      ctx.response = await fetchBudget(ctx, name, parseInt(year, 10));
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the budget annual revenue should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.summary.revenue.annual).toBe(v);
    });
  });

  test('Monthly and quarterly are consistent with annual', ({ given, when, then, and }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^an active recurring flow exists on "(.*)" with value "(.*)" direction "(.*)" amount "(.*)" frequency "(.*)" starting "(.*)"$/,
      async (stream: string, value: string, direction: string, amount: string, frequency: string, start: string) => {
        await createFlow(ctx, {
          valueStream: stream, valueName: value, direction: direction as 'inbound' | 'outbound',
          amount, frequency, startDate: start, status: 'active',
        });
      });
    when(/^I request the budget for "(.*)" for year (\d+)$/, async (name: string, year: string) => {
      ctx.response = await fetchBudget(ctx, name, parseInt(year, 10));
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and('the budget monthly should equal annual divided by 12', () => {
      const annual = Number(ctx.response.body.summary.revenue.annual);
      const monthly = Number(ctx.response.body.summary.revenue.monthly);
      expect(Math.abs(annual / 12 - monthly)).toBeLessThan(0.01);
    });
    and('the budget quarterly should equal annual divided by 4', () => {
      const annual = Number(ctx.response.body.summary.revenue.annual);
      const quarterly = Number(ctx.response.body.summary.revenue.quarterly);
      expect(Math.abs(annual / 4 - quarterly)).toBeLessThan(0.01);
    });
  });

  test('Missing baseAmount snapshots increment skippedFlows', ({ given, when, then, and }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(ctx, name);
    });
    and(/^an active recurring flow exists on "(.*)" with value "(.*)" direction "(.*)" amount "(.*)" frequency "(.*)" starting "(.*)"$/,
      async (stream: string, value: string, direction: string, amount: string, frequency: string, start: string) => {
        await createFlow(ctx, {
          valueStream: stream, valueName: value, direction: direction as 'inbound' | 'outbound',
          amount, frequency, startDate: start, status: 'active',
        });
      });
    when(/^I request the budget for "(.*)" for year (\d+)$/, async (name: string, year: string) => {
      ctx.response = await fetchBudget(ctx, name, parseInt(year, 10));
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the budget skippedFlows should be (\d+)$/, (n: string) => {
      expect(ctx.response.body.skippedFlows).toBe(parseInt(n));
    });
    and(/^the budget annual revenue should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.summary.revenue.annual).toBe(v);
    });
  });

  test('Multi-currency flows convert via baseAmount snapshot', ({ given, when, then, and }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^an active recurring flow exists on "(.*)" with value "(.*)" direction "(.*)" amount "(.*)" frequency "(.*)" starting "(.*)"$/,
      async (stream: string, value: string, direction: string, amount: string, frequency: string, start: string) => {
        await createFlow(ctx, {
          valueStream: stream, valueName: value, direction: direction as 'inbound' | 'outbound',
          amount, frequency, startDate: start, status: 'active',
        });
      });
    and(/^an active recurring flow exists on "(.*)" with value "(.*)" direction "(.*)" amount "(.*)" frequency "(.*)" starting "(.*)"$/,
      async (stream: string, value: string, direction: string, amount: string, frequency: string, start: string) => {
        await createFlow(ctx, {
          valueStream: stream, valueName: value, direction: direction as 'inbound' | 'outbound',
          amount, frequency, startDate: start, status: 'active',
        });
      });
    when(/^I request the budget for "(.*)" for year (\d+)$/, async (name: string, year: string) => {
      ctx.response = await fetchBudget(ctx, name, parseInt(year, 10));
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the budget annual revenue should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.summary.revenue.annual).toBe(v);
    });
    and(/^the budget annual expense should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.summary.expense.annual).toBe(v);
    });
    and(/^the budget annual net should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.summary.net.annual).toBe(v);
    });
  });

  test('Missing base value returns null totals', ({ given, when, then, and }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and('the system base value is cleared', async () => {
      await clearBaseValue(ctx);
    });
    when(/^I request the budget for "(.*)" for year (\d+)$/, async (name: string, year: string) => {
      ctx.response = await fetchBudget(ctx, name, parseInt(year, 10));
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and('the budget baseValue should be null', () => {
      expect(ctx.response.body.baseValue).toBeNull();
    });
    and(/^the budget annual revenue should be null$/, () => {
      expect(ctx.response.body.summary.revenue.annual).toBeNull();
    });
  });

  test('Unauthenticated user cannot fetch the budget', ({ given, when, then, and }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    when(/^I request the budget for "(.*)" for year (\d+) without authentication$/,
      async (name: string, year: string) => {
        ctx.response = await fetchBudget(ctx, name, parseInt(year, 10), { authenticated: false });
      });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
  });
});
