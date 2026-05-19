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
    '../../../../packages/bdd/features/dashboard/presentation-currency.feature',
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

async function ensureAgent(ctx: Ctx, name: string): Promise<string> {
  if (ctx.agents.has(name)) return ctx.agents.get(name)!;
  const res = await request(getApp().getHttpServer())
    .post('/agents')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'organization' });
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
  total: string,
) {
  await request(getApp().getHttpServer())
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
      items: [{ quantity: '1', unitPrice: total, total }],
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
    steps.and(/^an agent exists named "(.*)"$/, async (name: string) => {
      await ensureAgent(ctx, name);
    });
    steps.and(/^an agent exists named "(.*)"$/, async (name: string) => {
      await ensureAgent(ctx, name);
    });
  }

  test('Dashboard sums invoice items using presentationAmount', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^an invoice exists from "(.*)" to "(.*)" in "(.*)" totalling "(.*)"$/,
      async (from: string, to: string, currency: string, total: string) => {
        await createInvoice(ctx, from, to, currency, total);
      });
    when('I fetch the dashboard summary', async () => {
      ctx.response = await request(getApp().getHttpServer())
        .get('/dashboard/summary')
        .set('Cookie', [ctx.authCookie]);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the dashboard totalRevenue should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.totalRevenue).toBe(v);
    });
    and(/^the dashboard notConvertedCount should be (\d+)$/, (n: string) => {
      expect(ctx.response.body.notConvertedCount).toBe(parseInt(n));
    });
  });

  test('Invoice items without a rate increment notConvertedCount', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^a currency value exists named "(.*)"$/, async (name: string) => {
      await ensureCurrencyValue(ctx, name);
    });
    and(/^an invoice exists from "(.*)" to "(.*)" in "(.*)" totalling "(.*)"$/,
      async (from: string, to: string, currency: string, total: string) => {
        await createInvoice(ctx, from, to, currency, total);
      });
    when('I fetch the dashboard summary', async () => {
      ctx.response = await request(getApp().getHttpServer())
        .get('/dashboard/summary')
        .set('Cookie', [ctx.authCookie]);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the dashboard notConvertedCount should be (\d+)$/, (n: string) => {
      expect(ctx.response.body.notConvertedCount).toBe(parseInt(n));
    });
  });
});
