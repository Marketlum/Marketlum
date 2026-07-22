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
    '../../../../packages/bdd/features/invoices/snapshot-per-agent.feature',
  ),
);

interface Ctx {
  authCookie: string;
  values: Map<string, string>;
  agents: Map<string, string>;
  response: request.Response;
}

function makeCtx(): Ctx {
  return {
    authCookie: '',
    values: new Map(),
    agents: new Map(),
    response: {} as request.Response,
  };
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
  functionalCurrencyName: string | null,
): Promise<string> {
  if (ctx.agents.has(name)) return ctx.agents.get(name)!;
  const body: Record<string, unknown> = { name, type: 'organization' };
  if (functionalCurrencyName !== null) {
    body.functionalCurrencyId = ctx.values.get(functionalCurrencyName);
  }
  const res = await request(getApp().getHttpServer())
    .post('/agents')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
  ctx.agents.set(name, res.body.id);
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

async function createInvoice(
  ctx: Ctx,
  fromAgentName: string,
  toAgentName: string,
  currencyName: string,
  itemTotal: string,
): Promise<request.Response> {
  return request(getApp().getHttpServer())
    .post('/invoices')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({
      number: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      fromAgentId: ctx.agents.get(fromAgentName),
      toAgentId: ctx.agents.get(toAgentName),
      issuedAt: new Date().toISOString(),
      dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      currencyId: ctx.values.get(currencyName),
      items: [{ quantity: '1', unitPrice: itemTotal, total: itemTotal }],
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

  test('Cross-currency invoice writes both agent perspectives plus presentation', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^an agent exists named "(.*)" with functional currency "(.*)"$/,
      async (name: string, currency: string) => {
        await createAgent(ctx, name, currency);
      });
    and(/^an agent exists named "(.*)" with functional currency "(.*)"$/,
      async (name: string, currency: string) => {
        await createAgent(ctx, name, currency);
      });
    when(/^I create an invoice from "(.*)" to "(.*)" in "(.*)" with one item totalling "(.*)"$/,
      async (from: string, to: string, currency: string, total: string) => {
        ctx.response = await createInvoice(ctx, from, to, currency, total);
      });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the item fromAgentRate should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.items[0].fromAgentRate).toBe(v);
    });
    and(/^the item fromAgentAmount should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.items[0].fromAgentAmount).toBe(v);
    });
    and(/^the item toAgentRate should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.items[0].toAgentRate).toBe(v);
    });
    and(/^the item toAgentAmount should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.items[0].toAgentAmount).toBe(v);
    });
    and(/^the item presentationRate should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.items[0].presentationRate).toBe(v);
    });
    and(/^the item presentationAmount should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.items[0].presentationAmount).toBe(v);
    });
  });

  test('Same-currency invoice uses identity rate for both agents', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^an agent exists named "(.*)" with functional currency "(.*)"$/,
      async (name: string, currency: string) => {
        await createAgent(ctx, name, currency);
      });
    and(/^an agent exists named "(.*)" with functional currency "(.*)"$/,
      async (name: string, currency: string) => {
        await createAgent(ctx, name, currency);
      });
    when(/^I create an invoice from "(.*)" to "(.*)" in "(.*)" with one item totalling "(.*)"$/,
      async (from: string, to: string, currency: string, total: string) => {
        ctx.response = await createInvoice(ctx, from, to, currency, total);
      });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the item fromAgentRate should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.items[0].fromAgentRate).toBe(v);
    });
    and(/^the item toAgentRate should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.items[0].toAgentRate).toBe(v);
    });
  });

  test('Agent without functional currency leaves its perspective NULL', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^an agent exists named "(.*)" without a functional currency$/, async (name: string) => {
      await createAgent(ctx, name, null);
    });
    and(/^an agent exists named "(.*)" with functional currency "(.*)"$/,
      async (name: string, currency: string) => {
        await createAgent(ctx, name, currency);
      });
    when(/^I create an invoice from "(.*)" to "(.*)" in "(.*)" with one item totalling "(.*)"$/,
      async (from: string, to: string, currency: string, total: string) => {
        ctx.response = await createInvoice(ctx, from, to, currency, total);
      });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the item fromAgentRate should be null$/, () => {
      expect(ctx.response.body.items[0].fromAgentRate).toBeNull();
    });
    and(/^the item fromAgentAmount should be null$/, () => {
      expect(ctx.response.body.items[0].fromAgentAmount).toBeNull();
    });
    and(/^the item toAgentRate should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.items[0].toAgentRate).toBe(v);
    });
    and(/^the item toAgentAmount should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.items[0].toAgentAmount).toBe(v);
    });
  });
});
