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
  path.resolve(
    __dirname,
    '../../../../packages/bdd/features/actors/consolidated-financials.feature',
  ),
);

interface Ctx {
  authCookie: string;
  valueIds: Map<string, string>;
  actorIds: Map<string, string>;
  response: request.Response;
}

function makeCtx(): Ctx {
  return {
    authCookie: '',
    valueIds: new Map(),
    actorIds: new Map(),
    response: {} as request.Response,
  };
}

function server() {
  return getApp().getHttpServer();
}

async function createValue(ctx: Ctx, name: string): Promise<void> {
  if (ctx.valueIds.has(name)) return;
  const res = await request(server())
    .post('/values')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'currency', purpose: `Test currency ${name}` });
  ctx.valueIds.set(name, res.body.id);
}

async function createActor(
  ctx: Ctx,
  name: string,
  type: string,
  currencyName: string,
  parentName?: string,
): Promise<void> {
  const body: Record<string, unknown> = {
    name,
    type,
    functionalCurrencyId: ctx.valueIds.get(currencyName),
  };
  if (parentName) body.parentId = ctx.actorIds.get(parentName);
  const res = await request(server())
    .post('/actors')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
  ctx.actorIds.set(name, res.body.id);
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
    number?: string;
    onBehalfOf?: string;
  },
): Promise<void> {
  const body: Record<string, unknown> = {
    number: args.number ?? `INV-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    fromActorId: ctx.actorIds.get(args.from),
    toActorId: ctx.actorIds.get(args.to),
    currencyId: ctx.valueIds.get('USD'),
    issuedAt: `${args.issuedAt}T00:00:00.000Z`,
    dueAt: `${args.issuedAt}T00:00:00.000Z`,
    items: [{ quantity: '1.00', unitPrice: args.amount, total: args.amount }],
  };
  if (args.onBehalfOf) body.onBehalfOfActorId = ctx.actorIds.get(args.onBehalfOf);
  const res = await request(server())
    .post('/invoices')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
  expect(res.status).toBe(201);
}

type StepFn = (regex: RegExp | string, fn: (...args: never[]) => unknown) => void;

function registerBackground(ctx: Ctx, given: StepFn, and: StepFn) {
  given(/^I am authenticated as "(.*)"$/, async (email: string) => {
    ctx.authCookie = await createAuthenticatedUser(email, 'password123');
  });
  and(/^a currency value exists named "(.*)"$/, async (name: string) => {
    await createValue(ctx, name);
  });
  and(
    /^an actor exists named "(.*)" of type "(.*)" with functional currency "(.*)"$/,
    async (name: string, type: string, currency: string) => {
      await createActor(ctx, name, type, currency);
    },
  );
  const actorUnderParent = (step: StepFn) =>
    step(
      /^an actor exists named "(.*)" of type "(.*)" with functional currency "(.*)" under parent "(.*)"$/,
      async (name: string, type: string, currency: string, parent: string) => {
        await createActor(ctx, name, type, currency, parent);
      },
    );
  actorUnderParent(and);
  actorUnderParent(and);
  and(
    /^an actor exists named "(.*)" of type "(.*)" with functional currency "(.*)"$/,
    async (name: string, type: string, currency: string) => {
      await createActor(ctx, name, type, currency);
    },
  );
}

function registerPlainInvoice(ctx: Ctx, step: StepFn) {
  step(
    /^an invoice exists from "(.*)" to "(.*)" issued "(.*)" amount "(.*)"$/,
    async (from: string, to: string, issuedAt: string, amount: string) => {
      await createInvoice(ctx, { from, to, issuedAt, amount });
    },
  );
}

function registerOnBehalfInvoice(ctx: Ctx, step: StepFn) {
  step(
    /^an on-behalf invoice exists numbered "(.*)" from "(.*)" to "(.*)" on behalf of "(.*)" issued "(.*)" amount "(.*)"$/,
    async (
      number: string,
      from: string,
      to: string,
      onBehalfOf: string,
      issuedAt: string,
      amount: string,
    ) => {
      await createInvoice(ctx, { from, to, issuedAt, amount, number, onBehalfOf });
    },
  );
}

function registerRequests(ctx: Ctx, when: StepFn) {
  when(
    /^I request the (consolidated )?financials of "(.*)" for year (\d+)$/,
    async (consolidated: string, name: string, year: string) => {
      const suffix = consolidated ? '&consolidated=true' : '';
      ctx.response = await request(server())
        .get(`/actors/${ctx.actorIds.get(name)}/financials?year=${year}${suffix}`)
        .set('Cookie', [ctx.authCookie]);
    },
  );
}

function registerStatus(ctx: Ctx, then: StepFn) {
  then(/^the response status should be (\d+)$/, (status: string) => {
    expect(ctx.response.status).toBe(parseInt(status));
  });
}

function registerAnnual(ctx: Ctx, step: StepFn, key: 'revenue' | 'expense' | 'net') {
  step(new RegExp(`^the actor financials annual ${key} should be "(.*)"$`), (v: string) => {
    expect(ctx.response.body.summary[key].annual).toBe(v);
  });
}

function registerInvoiceCount(ctx: Ctx, step: StepFn) {
  step(/^the actor financials invoiceCount should be (\d+)$/, (n: string) => {
    expect(ctx.response.body.invoiceCount).toBe(parseInt(n));
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

  test('Consolidated view includes descendant revenue', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerPlainInvoice(ctx, given);
    registerRequests(ctx, when);
    registerStatus(ctx, then);
    registerAnnual(ctx, and, 'revenue');
    registerInvoiceCount(ctx, and);
  });

  test('Standalone view does not include descendant revenue', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerPlainInvoice(ctx, given);
    registerRequests(ctx, when);
    registerStatus(ctx, then);
    registerAnnual(ctx, and, 'revenue');
    registerInvoiceCount(ctx, and);
  });

  test('Intercompany internal invoices are eliminated in the consolidated view', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerOnBehalfInvoice(ctx, given);
    registerRequests(ctx, when);
    registerStatus(ctx, then);
    registerAnnual(ctx, and, 'revenue');
    registerAnnual(ctx, and, 'expense');
    registerAnnual(ctx, and, 'net');
    registerInvoiceCount(ctx, and);
  });

  test('The standalone view of an on-behalf issuer nets to zero', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerOnBehalfInvoice(ctx, given);
    registerRequests(ctx, when);
    registerStatus(ctx, then);
    registerAnnual(ctx, and, 'revenue');
    registerAnnual(ctx, and, 'expense');
    registerAnnual(ctx, and, 'net');
  });

  test('A descendant with a different functional currency is counted as not converted', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    given(/^a currency value exists named "(.*)"$/, async (name: string) => {
      await createValue(ctx, name);
    });
    and(
      /^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" effective "(.*)"$/,
      async (from: string, to: string, rate: string, effectiveAt: string) => {
        await createRate(ctx, from, to, rate, effectiveAt);
      },
    );
    and(
      /^an actor exists named "(.*)" of type "(.*)" with functional currency "(.*)" under parent "(.*)"$/,
      async (name: string, type: string, currency: string, parent: string) => {
        await createActor(ctx, name, type, currency, parent);
      },
    );
    registerPlainInvoice(ctx, and);
    registerRequests(ctx, when);
    registerStatus(ctx, then);
    registerAnnual(ctx, and, 'revenue');
    and(/^the actor financials notConvertedCount should be (\d+)$/, (n: string) => {
      expect(ctx.response.body.notConvertedCount).toBe(parseInt(n));
    });
    registerInvoiceCount(ctx, and);
  });

  test('Consolidated financials of a leaf actor equal the standalone view', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerPlainInvoice(ctx, given);
    registerRequests(ctx, when);
    registerStatus(ctx, then);
    registerAnnual(ctx, and, 'revenue');
    registerInvoiceCount(ctx, and);
  });
});
