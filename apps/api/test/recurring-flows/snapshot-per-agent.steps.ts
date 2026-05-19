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
import { ValueType } from '@marketlum/shared';

const feature = loadFeature(
  path.resolve(
    __dirname,
    '../../../../packages/bdd/features/recurring-flows/snapshot-per-agent.feature',
  ),
);

interface Ctx {
  authCookie: string;
  values: Map<string, string>;
  agents: Map<string, string>;
  streams: Map<string, string>;
  response: request.Response;
}

function makeCtx(): Ctx {
  return {
    authCookie: '',
    values: new Map(),
    agents: new Map(),
    streams: new Map(),
    response: {} as request.Response,
  };
}

let codeCounter = 0;
function nextCode(): string {
  return `vs_test_${Date.now()}_${++codeCounter}`;
}

async function ensureCurrencyValue(ctx: Ctx, name: string): Promise<string> {
  if (ctx.values.has(name)) return ctx.values.get(name)!;
  const res = await request(getApp().getHttpServer())
    .post('/values')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: ValueType.CURRENCY, purpose: `Currency ${name}` });
  ctx.values.set(name, res.body.id);
  return res.body.id;
}

async function createAgent(
  ctx: Ctx,
  name: string,
  functionalCurrencyName: string,
): Promise<string> {
  if (ctx.agents.has(name)) return ctx.agents.get(name)!;
  const res = await request(getApp().getHttpServer())
    .post('/agents')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({
      name,
      type: 'organization',
      functionalCurrencyId: ctx.values.get(functionalCurrencyName),
    });
  ctx.agents.set(name, res.body.id);
  return res.body.id;
}

async function createValueStream(
  ctx: Ctx,
  name: string,
  agentName: string | null,
): Promise<string> {
  if (ctx.streams.has(name)) return ctx.streams.get(name)!;
  const body: Record<string, unknown> = { code: nextCode(), name };
  if (agentName !== null) body.agentId = ctx.agents.get(agentName);
  const res = await request(getApp().getHttpServer())
    .post('/value-streams')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
  ctx.streams.set(name, res.body.id);
  return res.body.id;
}

async function setPresentationCurrency(ctx: Ctx, name: string) {
  await request(getApp().getHttpServer())
    .put('/system-settings/presentation-currency')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ presentationCurrencyId: ctx.values.get(name) });
}

async function createRate(
  ctx: Ctx,
  from: string,
  to: string,
  rate: string,
  effectiveAt: string,
) {
  await request(getApp().getHttpServer())
    .post('/exchange-rates')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({
      fromValueId: ctx.values.get(from),
      toValueId: ctx.values.get(to),
      rate,
      effectiveAt: new Date(effectiveAt).toISOString(),
    });
}

async function createFlow(
  ctx: Ctx,
  streamName: string,
  counterpartyName: string,
  direction: 'inbound' | 'outbound',
  currencyName: string,
  amount: string,
  startDate: string,
): Promise<request.Response> {
  return request(getApp().getHttpServer())
    .post('/recurring-flows')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({
      valueStreamId: ctx.streams.get(streamName),
      counterpartyAgentId: ctx.agents.get(counterpartyName),
      currencyId: ctx.values.get(currencyName),
      direction,
      amount,
      frequency: 'monthly',
      interval: 1,
      startDate,
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
    steps.and(/^a currency value exists named "(.*)"$/, async (name: string) => {
      await ensureCurrencyValue(ctx, name);
    });
    steps.and(/^a currency value exists named "(.*)"$/, async (name: string) => {
      await ensureCurrencyValue(ctx, name);
    });
    steps.and(/^the system presentation currency is "(.*)"$/, async (name: string) => {
      await setPresentationCurrency(ctx, name);
    });
    steps.and(
      /^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" effective "(.*)"$/,
      async (from: string, to: string, rate: string, effectiveAt: string) => {
        await createRate(ctx, from, to, rate, effectiveAt);
      },
    );
  }

  test('Inbound flow maps counterparty to fromAgent and value-stream agent to toAgent', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^an agent exists named "(.*)" with functional currency "(.*)"$/,
      async (name: string, currency: string) => { await createAgent(ctx, name, currency); });
    and(/^an agent exists named "(.*)" with functional currency "(.*)"$/,
      async (name: string, currency: string) => { await createAgent(ctx, name, currency); });
    and(/^a value stream exists named "(.*)" with agent "(.*)"$/,
      async (name: string, agentName: string) => { await createValueStream(ctx, name, agentName); });
    when(/^I create an inbound recurring flow on "(.*)" with counterparty "(.*)" currency "(.*)" amount "(.*)" starting "(.*)"$/,
      async (streamName: string, counterparty: string, currency: string, amount: string, startDate: string) => {
        ctx.response = await createFlow(ctx, streamName, counterparty, 'inbound', currency, amount, startDate);
      });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the flow fromAgentRate should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.fromAgentRate).toBe(v);
    });
    and(/^the flow toAgentRate should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.toAgentRate).toBe(v);
    });
    and(/^the flow toAgentAmount should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.toAgentAmount).toBe(v);
    });
  });

  test('Outbound flow reverses the from/to mapping', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^an agent exists named "(.*)" with functional currency "(.*)"$/,
      async (name: string, currency: string) => { await createAgent(ctx, name, currency); });
    and(/^an agent exists named "(.*)" with functional currency "(.*)"$/,
      async (name: string, currency: string) => { await createAgent(ctx, name, currency); });
    and(/^a value stream exists named "(.*)" with agent "(.*)"$/,
      async (name: string, agentName: string) => { await createValueStream(ctx, name, agentName); });
    when(/^I create an outbound recurring flow on "(.*)" with counterparty "(.*)" currency "(.*)" amount "(.*)" starting "(.*)"$/,
      async (streamName: string, counterparty: string, currency: string, amount: string, startDate: string) => {
        ctx.response = await createFlow(ctx, streamName, counterparty, 'outbound', currency, amount, startDate);
      });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the flow fromAgentRate should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.fromAgentRate).toBe(v);
    });
    and(/^the flow fromAgentAmount should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.fromAgentAmount).toBe(v);
    });
    and(/^the flow toAgentRate should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.toAgentRate).toBe(v);
    });
  });

  test('Value stream without an agent leaves the value-stream-side snapshot NULL', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^an agent exists named "(.*)" with functional currency "(.*)"$/,
      async (name: string, currency: string) => { await createAgent(ctx, name, currency); });
    and(/^a value stream exists named "(.*)" without an agent$/,
      async (name: string) => { await createValueStream(ctx, name, null); });
    when(/^I create an inbound recurring flow on "(.*)" with counterparty "(.*)" currency "(.*)" amount "(.*)" starting "(.*)"$/,
      async (streamName: string, counterparty: string, currency: string, amount: string, startDate: string) => {
        ctx.response = await createFlow(ctx, streamName, counterparty, 'inbound', currency, amount, startDate);
      });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the flow fromAgentRate should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.fromAgentRate).toBe(v);
    });
    and(/^the flow toAgentRate should be null$/, () => {
      expect(ctx.response.body.toAgentRate).toBeNull();
    });
    and(/^the flow toAgentAmount should be null$/, () => {
      expect(ctx.response.body.toAgentAmount).toBeNull();
    });
  });
});
