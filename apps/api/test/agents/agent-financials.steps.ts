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
  path.resolve(__dirname, '../../../../packages/bdd/features/agents/agent-financials.feature'),
);

interface Ctx {
  authCookie: string;
  valueIds: Map<string, string>;
  agentIds: Map<string, string>;
  response: request.Response;
}

function makeCtx(): Ctx {
  return {
    authCookie: '',
    valueIds: new Map(),
    agentIds: new Map(),
    response: {} as request.Response,
  };
}

function server() {
  return getApp().getHttpServer();
}

async function ensureValue(ctx: Ctx, name: string): Promise<string> {
  if (ctx.valueIds.has(name)) return ctx.valueIds.get(name)!;
  const res = await request(server())
    .post('/values')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'currency', purpose: `Test currency ${name}` });
  ctx.valueIds.set(name, res.body.id);
  return res.body.id;
}

async function createAgent(
  ctx: Ctx,
  name: string,
  functionalCurrencyName: string | null,
): Promise<string> {
  const body: Record<string, unknown> = { name, type: 'organization' };
  if (functionalCurrencyName !== null) {
    body.functionalCurrencyId = ctx.valueIds.get(functionalCurrencyName);
  }
  const res = await request(server())
    .post('/agents')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
  ctx.agentIds.set(name, res.body.id);
  return res.body.id;
}

async function createRate(
  ctx: Ctx,
  from: string,
  to: string,
  rate: string,
  effectiveAt: string,
): Promise<void> {
  await request(server())
    .post('/exchange-rates')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({
      fromValueId: ctx.valueIds.get(from),
      toValueId: ctx.valueIds.get(to),
      rate,
      effectiveAt: `${effectiveAt}T00:00:00.000Z`,
    });
}

async function createInvoice(
  ctx: Ctx,
  args: {
    from: string;
    to: string;
    issuedAt: string;
    amount: string;
    direction: string;
    currencyName?: string;
    paid?: boolean;
  },
): Promise<void> {
  const res = await request(server())
    .post('/invoices')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({
      number: `INV-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      fromAgentId: ctx.agentIds.get(args.from),
      toAgentId: ctx.agentIds.get(args.to),
      currencyId: ctx.valueIds.get(args.currencyName ?? 'USD'),
      direction: args.direction,
      issuedAt: `${args.issuedAt}T00:00:00.000Z`,
      dueAt: `${args.issuedAt}T00:00:00.000Z`,
      paid: args.paid ?? false,
      items: [{ quantity: '1.00', unitPrice: args.amount, total: args.amount }],
    });
  expect(res.status).toBe(201);
}

async function fetchFinancials(
  ctx: Ctx,
  agentName: string,
  year: number,
  options: { authenticated?: boolean; nonExistent?: boolean } = {},
): Promise<request.Response> {
  const agentId = options.nonExistent
    ? '00000000-0000-0000-0000-000000000000'
    : ctx.agentIds.get(agentName)!;
  const req = request(server()).get(`/agents/${agentId}/financials?year=${year}`);
  if (options.authenticated ?? true) req.set('Cookie', [ctx.authCookie]);
  return req;
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

  function registerBackground(ctx: Ctx, given: StepFn, and: StepFn) {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      ctx.authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a currency value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(ctx, name);
    });
    const agentWithCurrency = (step: StepFn) =>
      step(
        /^an agent exists named "(.*)" with functional currency "(.*)"$/,
        async (name: string, currency: string) => {
          await createAgent(ctx, name, currency);
        },
      );
    agentWithCurrency(and);
    agentWithCurrency(and);
  }

  function registerInvoiceStep(ctx: Ctx, step: StepFn) {
    step(
      /^an invoice exists from "(.*)" to "(.*)" issued "(.*)" amount "(.*)" with direction "(.*)"$/,
      async (from: string, to: string, issuedAt: string, amount: string, direction: string) => {
        await createInvoice(ctx, { from, to, issuedAt, amount, direction });
      },
    );
  }

  function registerRequest(ctx: Ctx, when: StepFn) {
    when(/^I request the financials of "(.*)" for year (\d+)$/, async (name: string, year: string) => {
      ctx.response = await fetchFinancials(ctx, name, parseInt(year, 10));
    });
  }

  function registerStatus(ctx: Ctx, then: StepFn) {
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
  }

  function registerAnnual(ctx: Ctx, step: StepFn, key: 'revenue' | 'expense' | 'net') {
    step(new RegExp(`^the agent financials annual ${key} should be "(.*)"$`), (v: string) => {
      expect(ctx.response.body.summary[key].annual).toBe(v);
    });
  }

  function registerInvoiceCount(ctx: Ctx, step: StepFn) {
    step(/^the agent financials invoiceCount should be (\d+)$/, (n: string) => {
      expect(ctx.response.body.invoiceCount).toBe(parseInt(n));
    });
  }

  test('Issued invoices are revenue and received invoices are expense', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerInvoiceStep(ctx, given);
    registerInvoiceStep(ctx, and);
    registerRequest(ctx, when);
    registerStatus(ctx, then);
    registerAnnual(ctx, and, 'revenue');
    registerAnnual(ctx, and, 'expense');
    registerAnnual(ctx, and, 'net');
    registerInvoiceCount(ctx, and);
  });

  test('The invoice direction column does not affect the agent P&L', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerInvoiceStep(ctx, given);
    registerRequest(ctx, when);
    registerStatus(ctx, then);
    registerAnnual(ctx, and, 'revenue');
    registerAnnual(ctx, and, 'expense');
  });

  test('Figures land in the correct month and quarter', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerInvoiceStep(ctx, given);
    registerRequest(ctx, when);
    registerStatus(ctx, then);
    const monthAssert = (step: StepFn) =>
      step(
        /^the agent financials month "(.*)" revenue should be "(.*)"$/,
        (month: string, v: string) => {
          const row = ctx.response.body.byMonth.find((m: { month: string }) => m.month === month);
          expect(row).toBeDefined();
          expect(row.revenue).toBe(v);
        },
      );
    monthAssert(and);
    monthAssert(and);
    const quarterAssert = (step: StepFn) =>
      step(
        /^the agent financials quarter "(.*)" revenue should be "(.*)"$/,
        (quarter: string, v: string) => {
          const row = ctx.response.body.byQuarter.find(
            (q: { quarter: string }) => q.quarter === quarter,
          );
          expect(row).toBeDefined();
          expect(row.revenue).toBe(v);
        },
      );
    quarterAssert(and);
    quarterAssert(and);
  });

  test("Amounts are converted into the agent's functional currency", ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    given(/^a currency value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(ctx, name);
    });
    and(
      /^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" effective "(.*)"$/,
      async (from: string, to: string, rate: string, effectiveAt: string) => {
        await createRate(ctx, from, to, rate, effectiveAt);
      },
    );
    and(
      /^an agent exists named "(.*)" with functional currency "(.*)"$/,
      async (name: string, currency: string) => {
        await createAgent(ctx, name, currency);
      },
    );
    and(
      /^an invoice exists from "(.*)" to "(.*)" in "(.*)" issued "(.*)" amount "(.*)" with direction "(.*)"$/,
      async (from: string, to: string, currency: string, issuedAt: string, amount: string, direction: string) => {
        await createInvoice(ctx, { from, to, issuedAt, amount, direction, currencyName: currency });
      },
    );
    registerRequest(ctx, when);
    registerStatus(ctx, then);
    and(/^the agent financials functional currency should be "(.*)"$/, (name: string) => {
      expect(ctx.response.body.functionalCurrency).not.toBeNull();
      expect(ctx.response.body.functionalCurrency.name).toBe(name);
    });
    registerAnnual(ctx, and, 'revenue');
  });

  test('Invoices without a per-agent snapshot are excluded and counted', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    const currencyStep = (step: StepFn) =>
      step(/^a currency value exists named "(.*)"$/, async (name: string) => {
        await ensureValue(ctx, name);
      });
    currencyStep(given);
    currencyStep(and);
    and(
      /^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" effective "(.*)"$/,
      async (from: string, to: string, rate: string, effectiveAt: string) => {
        await createRate(ctx, from, to, rate, effectiveAt);
      },
    );
    and(
      /^an agent exists named "(.*)" with functional currency "(.*)"$/,
      async (name: string, currency: string) => {
        await createAgent(ctx, name, currency);
      },
    );
    const currencyInvoice = (step: StepFn) =>
      step(
        /^an invoice exists from "(.*)" to "(.*)" in "(.*)" issued "(.*)" amount "(.*)" with direction "(.*)"$/,
        async (from: string, to: string, currency: string, issuedAt: string, amount: string, direction: string) => {
          await createInvoice(ctx, { from, to, issuedAt, amount, direction, currencyName: currency });
        },
      );
    currencyInvoice(and);
    currencyInvoice(and);
    registerRequest(ctx, when);
    registerStatus(ctx, then);
    registerAnnual(ctx, and, 'revenue');
    registerInvoiceCount(ctx, and);
    and(/^the agent financials notConvertedCount should be (\d+)$/, (n: string) => {
      expect(ctx.response.body.notConvertedCount).toBe(parseInt(n));
    });
  });

  test('Invoices outside the requested year are excluded', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerInvoiceStep(ctx, given);
    registerInvoiceStep(ctx, and);
    registerRequest(ctx, when);
    registerStatus(ctx, then);
    registerAnnual(ctx, and, 'revenue');
    registerInvoiceCount(ctx, and);
  });

  test('Unpaid invoices are included in the accrual view', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    given(
      /^an unpaid invoice exists from "(.*)" to "(.*)" issued "(.*)" amount "(.*)" with direction "(.*)"$/,
      async (from: string, to: string, issuedAt: string, amount: string, direction: string) => {
        await createInvoice(ctx, { from, to, issuedAt, amount, direction, paid: false });
      },
    );
    registerRequest(ctx, when);
    registerStatus(ctx, then);
    registerAnnual(ctx, and, 'revenue');
  });

  test('An agent without a functional currency gets null figures with counts', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    given(/^an agent exists named "(.*)" without a functional currency$/, async (name: string) => {
      await createAgent(ctx, name, null);
    });
    registerInvoiceStep(ctx, and);
    registerRequest(ctx, when);
    registerStatus(ctx, then);
    and(/^the agent financials functional currency should be null$/, () => {
      expect(ctx.response.body.functionalCurrency).toBeNull();
    });
    and(/^the agent financials annual revenue should be null$/, () => {
      expect(ctx.response.body.summary.revenue.annual).toBeNull();
    });
    registerInvoiceCount(ctx, and);
  });

  test('A self-invoice counts as both revenue and expense', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerInvoiceStep(ctx, given);
    registerRequest(ctx, when);
    registerStatus(ctx, then);
    registerAnnual(ctx, and, 'revenue');
    registerAnnual(ctx, and, 'expense');
    registerAnnual(ctx, and, 'net');
    registerInvoiceCount(ctx, and);
  });

  test('Requesting financials for a non-existent agent returns 404', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    when(/^I request the financials of a non-existent agent for year (\d+)$/, async (year: string) => {
      ctx.response = await fetchFinancials(ctx, 'Acme', parseInt(year, 10), { nonExistent: true });
    });
    registerStatus(ctx, then);
  });

  test('Unauthenticated user cannot fetch agent financials', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    when(
      /^I request the financials of "(.*)" for year (\d+) without authentication$/,
      async (name: string, year: string) => {
        ctx.response = await fetchFinancials(ctx, name, parseInt(year, 10), { authenticated: false });
      },
    );
    registerStatus(ctx, then);
  });
});
