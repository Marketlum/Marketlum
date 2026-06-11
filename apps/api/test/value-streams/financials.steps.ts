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
  path.resolve(__dirname, '../../../../packages/bdd/features/value-streams/financials.feature'),
);

interface Ctx {
  authCookie: string;
  valueIds: Map<string, string>;
  valueStreamIds: Map<string, string>;
  agentIds: Map<string, string>;
  response: request.Response;
}

function makeCtx(): Ctx {
  return {
    authCookie: '',
    valueIds: new Map(),
    valueStreamIds: new Map(),
    agentIds: new Map(),
    response: {} as request.Response,
  };
}

async function ensureValue(ctx: Ctx, name: string): Promise<string> {
  if (ctx.valueIds.has(name)) return ctx.valueIds.get(name)!;
  const res = await request(getApp().getHttpServer())
    .post('/values')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'currency', purpose: `Test currency ${name}` });
  ctx.valueIds.set(name, res.body.id);
  return res.body.id;
}

async function ensureAgent(ctx: Ctx, name: string): Promise<string> {
  if (ctx.agentIds.has(name)) return ctx.agentIds.get(name)!;
  const res = await request(getApp().getHttpServer())
    .post('/agents')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'organization' });
  ctx.agentIds.set(name, res.body.id);
  return res.body.id;
}

async function ensureValueStream(ctx: Ctx, name: string, parentName?: string): Promise<string> {
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

async function setPresentationCurrency(ctx: Ctx, name: string) {
  await request(getApp().getHttpServer())
    .put('/system-settings/presentation-currency')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ presentationCurrencyId: ctx.valueIds.get(name)! });
}

async function clearPresentationCurrency(ctx: Ctx) {
  await request(getApp().getHttpServer())
    .put('/system-settings/presentation-currency')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ presentationCurrencyId: null });
}

async function createInvoice(
  ctx: Ctx,
  args: {
    direction: 'revenue' | 'expense';
    valueStream: string;
    issuedAt: string;
    amount: string;
    currencyName?: string;
  },
): Promise<string> {
  const fromAgentId = ctx.agentIds.get('Seller')!;
  const toAgentId = ctx.agentIds.get('Buyer')!;
  const currencyId = ctx.valueIds.get(args.currencyName ?? 'USD')!;
  const valueStreamId = ctx.valueStreamIds.get(args.valueStream)!;
  const res = await request(getApp().getHttpServer())
    .post('/invoices')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({
      number: `INV-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      fromAgentId,
      toAgentId,
      currencyId,
      direction: args.direction,
      issuedAt: `${args.issuedAt}T00:00:00.000Z`,
      dueAt: `${args.issuedAt}T00:00:00.000Z`,
      valueStreamId,
      items: [{ quantity: '1.00', unitPrice: args.amount, total: args.amount }],
    });
  return res.body.id;
}

async function fetchFinancials(
  ctx: Ctx,
  streamName: string,
  year: number,
  options: { directOnly?: boolean; authenticated?: boolean; nonExistent?: boolean } = {},
): Promise<request.Response> {
  const directOnly = options.directOnly ?? false;
  const authenticated = options.authenticated ?? true;
  const streamId = options.nonExistent
    ? '00000000-0000-0000-0000-000000000000'
    : ctx.valueStreamIds.get(streamName)!;
  const url = `/value-streams/${streamId}/financials?year=${year}&directOnly=${directOnly}`;
  const req = request(getApp().getHttpServer()).get(url);
  if (authenticated) req.set('Cookie', [ctx.authCookie]);
  return req;
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
  steps.and(/^the system presentation currency is "(.*)"$/, async (name: string) => {
    await setPresentationCurrency(ctx, name);
  });
  steps.and(/^an agent exists named "(.*)"$/, async (name: string) => {
    await ensureAgent(ctx, name);
  });
  steps.and(/^an agent exists named "(.*)"$/, async (name: string) => {
    await ensureAgent(ctx, name);
  });
  steps.and(/^a value stream exists named "(.*)"$/, async (name: string) => {
    await ensureValueStream(ctx, name);
  });
}

function registerInvoiceSteps(
  ctx: Ctx,
  and: (regex: RegExp | string, fn: (...args: never[]) => unknown) => void,
) {
  and(
    /^an? "(revenue|expense)" invoice exists on "(.*)" issued "(.*)" amount "(.*)"$/,
    async (direction: string, stream: string, issuedAt: string, amount: string) => {
      await createInvoice(ctx, {
        direction: direction as 'revenue' | 'expense',
        valueStream: stream,
        issuedAt,
        amount,
      });
    },
  );
}

function registerRequest(
  ctx: Ctx,
  when: (regex: RegExp | string, fn: (...args: never[]) => unknown) => void,
) {
  when(/^I request the financials for "(.*)" for year (\d+)$/, async (name: string, year: string) => {
    ctx.response = await fetchFinancials(ctx, name, parseInt(year, 10));
  });
}

function registerAssertions(
  ctx: Ctx,
  steps: {
    then: (regex: RegExp | string, fn: (...args: never[]) => unknown) => void;
    and: (regex: RegExp | string, fn: (...args: never[]) => unknown) => void;
  },
) {
  steps.then(/^the response status should be (\d+)$/, (status: string) => {
    expect(ctx.response.status).toBe(parseInt(status));
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

  test('Revenue and expense are split by invoice direction', ({ given, when, then, and }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(
      /^an? "(revenue|expense)" invoice exists on "(.*)" issued "(.*)" amount "(.*)"$/,
      async (direction: string, stream: string, issuedAt: string, amount: string) => {
        await createInvoice(ctx, { direction: direction as 'revenue' | 'expense', valueStream: stream, issuedAt, amount });
      },
    );
    and(
      /^an? "(revenue|expense)" invoice exists on "(.*)" issued "(.*)" amount "(.*)"$/,
      async (direction: string, stream: string, issuedAt: string, amount: string) => {
        await createInvoice(ctx, { direction: direction as 'revenue' | 'expense', valueStream: stream, issuedAt, amount });
      },
    );
    registerRequest(ctx, when);
    registerAssertions(ctx, { then, and });
    and(/^the financials annual revenue should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.summary.revenue.annual).toBe(v);
    });
    and(/^the financials annual expense should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.summary.expense.annual).toBe(v);
    });
    and(/^the financials annual net should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.summary.net.annual).toBe(v);
    });
    and(/^the financials invoiceCount should be (\d+)$/, (n: string) => {
      expect(ctx.response.body.invoiceCount).toBe(parseInt(n));
    });
  });

  test('Per-month figures land in the correct month', ({ given, when, then, and }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    registerInvoiceSteps(ctx, and);
    registerRequest(ctx, when);
    registerAssertions(ctx, { then, and });
    and(/^the financials month "(.*)" revenue should be "(.*)"$/, (month: string, v: string) => {
      const row = ctx.response.body.byMonth.find((m: { month: string }) => m.month === month);
      expect(row).toBeDefined();
      expect(row.revenue).toBe(v);
    });
    and(/^the financials month "(.*)" revenue should be "(.*)"$/, (month: string, v: string) => {
      const row = ctx.response.body.byMonth.find((m: { month: string }) => m.month === month);
      expect(row).toBeDefined();
      expect(row.revenue).toBe(v);
    });
  });

  test('Subtree mode includes descendant invoices', ({ given, when, then, and }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^a child value stream "(.*)" exists under "(.*)"$/, async (child: string, parent: string) => {
      await ensureValueStream(ctx, child, parent);
    });
    registerInvoiceSteps(ctx, and);
    registerRequest(ctx, when);
    registerAssertions(ctx, { then, and });
    and(/^the financials annual revenue should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.summary.revenue.annual).toBe(v);
    });
  });

  test('Direct-only excludes descendant invoices', ({ given, when, then, and }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^a child value stream "(.*)" exists under "(.*)"$/, async (child: string, parent: string) => {
      await ensureValueStream(ctx, child, parent);
    });
    registerInvoiceSteps(ctx, and);
    when(/^I request the financials for "(.*)" for year (\d+) with directOnly true$/, async (name: string, year: string) => {
      ctx.response = await fetchFinancials(ctx, name, parseInt(year, 10), { directOnly: true });
    });
    registerAssertions(ctx, { then, and });
    and(/^the financials annual revenue should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.summary.revenue.annual).toBe(v);
    });
  });

  test('Invoices outside the requested year are excluded', ({ given, when, then, and }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    registerInvoiceSteps(ctx, and);
    registerRequest(ctx, when);
    registerAssertions(ctx, { then, and });
    and(/^the financials annual revenue should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.summary.revenue.annual).toBe(v);
    });
    and(/^the financials invoiceCount should be (\d+)$/, (n: string) => {
      expect(ctx.response.body.invoiceCount).toBe(parseInt(n));
    });
  });

  test('Missing presentation currency returns null figures with counts', ({ given, when, then, and }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and('the system presentation currency is cleared', async () => {
      await clearPresentationCurrency(ctx);
    });
    registerInvoiceSteps(ctx, and);
    registerRequest(ctx, when);
    registerAssertions(ctx, { then, and });
    and('the financials presentationCurrency should be null', () => {
      expect(ctx.response.body.presentationCurrency).toBeNull();
    });
    and(/^the financials annual revenue should be null$/, () => {
      expect(ctx.response.body.summary.revenue.annual).toBeNull();
    });
    and(/^the financials invoiceCount should be (\d+)$/, (n: string) => {
      expect(ctx.response.body.invoiceCount).toBe(parseInt(n));
    });
  });

  test('Unconverted line items increment notConvertedCount', ({ given, when, then, and }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(ctx, name);
    });
    and(
      /^an? "(revenue|expense)" invoice exists on "(.*)" issued "(.*)" amount "(.*)" in currency "(.*)"$/,
      async (direction: string, stream: string, issuedAt: string, amount: string, currency: string) => {
        await createInvoice(ctx, {
          direction: direction as 'revenue' | 'expense',
          valueStream: stream,
          issuedAt,
          amount,
          currencyName: currency,
        });
      },
    );
    registerRequest(ctx, when);
    registerAssertions(ctx, { then, and });
    and(/^the financials notConvertedCount should be (\d+)$/, (n: string) => {
      expect(ctx.response.body.notConvertedCount).toBe(parseInt(n));
    });
    and(/^the financials annual revenue should be "(.*)"$/, (v: string) => {
      expect(ctx.response.body.summary.revenue.annual).toBe(v);
    });
  });

  test('Requesting financials for a non-existent value stream returns 404', ({ given, when, then, and }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    when(/^I request the financials for a non-existent value stream for year (\d+)$/, async (year: string) => {
      ctx.response = await fetchFinancials(ctx, 'Platform', parseInt(year, 10), { nonExistent: true });
    });
    registerAssertions(ctx, { then, and });
  });

  test('Unauthenticated user cannot fetch financials', ({ given, when, then, and }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    when(/^I request the financials for "(.*)" for year (\d+) without authentication$/, async (name: string, year: string) => {
      ctx.response = await fetchFinancials(ctx, name, parseInt(year, 10), { authenticated: false });
    });
    registerAssertions(ctx, { then, and });
  });
});
