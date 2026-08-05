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
  path.resolve(__dirname, '../../../../packages/bdd/features/dashboard/mirror-exclusion.feature'),
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
  const res = await request(server())
    .post('/values')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'currency' });
  ctx.valueIds.set(name, res.body.id);
  // The dashboard sums presentationAmount snapshots, so the test currency
  // must be the system presentation currency (identity-rate snapshots).
  await request(server())
    .put('/system-settings/presentation-currency')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ presentationCurrencyId: res.body.id });
}

async function createActor(
  ctx: Ctx,
  name: string,
  type: string,
  parentName?: string,
): Promise<void> {
  const body: Record<string, unknown> = { name, type };
  if (parentName) body.parentId = ctx.actorIds.get(parentName);
  const res = await request(server())
    .post('/actors')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
  ctx.actorIds.set(name, res.body.id);
}

async function createInvoice(
  ctx: Ctx,
  args: {
    from: string;
    to: string;
    issuedAt: string;
    total: string;
    market?: string;
    number?: string;
    onBehalfOf?: string;
  },
): Promise<void> {
  const body: Record<string, unknown> = {
    number: args.number ?? `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    fromActorId: ctx.actorIds.get(args.from),
    toActorId: ctx.actorIds.get(args.to),
    currencyId: ctx.valueIds.get('USD'),
    issuedAt: `${args.issuedAt}T00:00:00.000Z`,
    dueAt: `${args.issuedAt}T00:00:00.000Z`,
    market: args.market ?? 'external',
    items: [{ quantity: '1.00', unitPrice: args.total, total: args.total }],
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
  and(/^a value exists with name "(.*)"$/, async (name: string) => {
    await createValue(ctx, name);
  });
  and(/^an actor exists named "(.*)" of type "(.*)"$/, async (name: string, type: string) => {
    await createActor(ctx, name, type);
  });
  and(
    /^an actor exists named "(.*)" of type "(.*)" under parent "(.*)"$/,
    async (name: string, type: string, parent: string) => {
      await createActor(ctx, name, type, parent);
    },
  );
  and(/^an actor exists named "(.*)" of type "(.*)"$/, async (name: string, type: string) => {
    await createActor(ctx, name, type);
  });
}

function registerOnBehalfInvoice(ctx: Ctx, step: StepFn) {
  step(
    /^an on-behalf invoice exists numbered "(.*)" from "(.*)" to "(.*)" on behalf of "(.*)" issued at "(.*)" totalling "(.*)"$/,
    async (
      number: string,
      from: string,
      to: string,
      onBehalfOf: string,
      issuedAt: string,
      total: string,
    ) => {
      await createInvoice(ctx, { from, to, issuedAt, total, number, onBehalfOf });
    },
  );
}

function registerSummaryAssertions(ctx: Ctx, when: StepFn, then: StepFn, and: StepFn) {
  when(/^I request the dashboard summary$/, async () => {
    ctx.response = await request(server())
      .get('/dashboard/summary')
      .set('Cookie', [ctx.authCookie]);
  });
  then(/^the response status should be (\d+)$/, (status: string) => {
    expect(ctx.response.status).toBe(parseInt(status));
  });
  and(/^the response should contain totalRevenue "(.*)"$/, (totalRevenue: string) => {
    expect(ctx.response.body.totalRevenue).toBe(totalRevenue);
  });
  and(/^the response should contain invoiceCount (\d+)$/, (count: string) => {
    expect(ctx.response.body.invoiceCount).toBe(parseInt(count));
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

  test('Mirror invoices are not counted in dashboard totals', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerOnBehalfInvoice(ctx, given);
    registerSummaryAssertions(ctx, when, then, and);
  });

  test('Genuine internal invoices remain included', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    given(
      /^an internal invoice exists from "(.*)" to "(.*)" issued at "(.*)" totalling "(.*)"$/,
      async (from: string, to: string, issuedAt: string, total: string) => {
        await createInvoice(ctx, { from, to, issuedAt, total, market: 'internal' });
      },
    );
    registerOnBehalfInvoice(ctx, and);
    registerSummaryAssertions(ctx, when, then, and);
  });
});
