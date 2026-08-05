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
  path.resolve(__dirname, '../../../../packages/bdd/features/invoices/legal-entity.feature'),
);

interface Ctx {
  authCookie: string;
  valueIds: Map<string, string>;
  actorIds: Map<string, string>;
  invoiceId: string;
  response: request.Response;
}

function makeCtx(): Ctx {
  return {
    authCookie: '',
    valueIds: new Map(),
    actorIds: new Map(),
    invoiceId: '',
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
    .send({ name, type: 'currency', purpose: `Test currency ${name}` });
  ctx.valueIds.set(name, res.body.id);
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
  number: string,
  market: string,
  from: string,
  to: string,
): Promise<request.Response> {
  const res = await request(server())
    .post('/invoices')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({
      number,
      fromActorId: ctx.actorIds.get(from),
      toActorId: ctx.actorIds.get(to),
      currencyId: ctx.valueIds.get('USD'),
      issuedAt: '2026-01-15T00:00:00.000Z',
      dueAt: '2026-02-15T00:00:00.000Z',
      market,
    });
  if (res.status === 201) ctx.invoiceId = res.body.id;
  return res;
}

type StepFn = (regex: RegExp | string, fn: (...args: never[]) => unknown) => void;

function registerBackground(ctx: Ctx, given: StepFn, and: StepFn) {
  given(/^I am authenticated as "(.*)"$/, async (email: string) => {
    ctx.authCookie = await createAuthenticatedUser(email, 'password123');
  });
  and(/^a currency value exists named "(.*)"$/, async (name: string) => {
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

function registerStatus(ctx: Ctx, then: StepFn) {
  then(/^the response status should be (\d+)$/, (status: string) => {
    expect(ctx.response.status).toBe(parseInt(status));
  });
}

function registerCreateWhen(ctx: Ctx, when: StepFn) {
  when(
    /^I create an (external|internal) invoice numbered "(.*)" from "(.*)" to "(.*)"$/,
    async (market: string, number: string, from: string, to: string) => {
      ctx.response = await createInvoice(ctx, number, market, from, to);
    },
  );
}

function registerExistingInvoice(ctx: Ctx, given: StepFn) {
  given(
    /^an (external|internal) invoice exists numbered "(.*)" from "(.*)" to "(.*)"$/,
    async (market: string, number: string, from: string, to: string) => {
      const res = await createInvoice(ctx, number, market, from, to);
      expect(res.status).toBe(201);
    },
  );
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

  test('A virtual actor cannot issue an external invoice', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerCreateWhen(ctx, when);
    registerStatus(ctx, then);
  });

  test('An organization can issue an external invoice', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerCreateWhen(ctx, when);
    registerStatus(ctx, then);
  });

  test('A virtual actor can issue an internal invoice', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerCreateWhen(ctx, when);
    registerStatus(ctx, then);
  });

  test("Updating an external invoice's issuer to a virtual actor is rejected", ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerExistingInvoice(ctx, given);
    when(/^I update the invoice's from actor to "(.*)"$/, async (name: string) => {
      ctx.response = await request(server())
        .patch(`/invoices/${ctx.invoiceId}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ fromActorId: ctx.actorIds.get(name) });
    });
    registerStatus(ctx, then);
  });

  test('Switching an internal invoice with a virtual issuer to external is rejected', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerExistingInvoice(ctx, given);
    when(/^I update the invoice's market to "(.*)"$/, async (market: string) => {
      ctx.response = await request(server())
        .patch(`/invoices/${ctx.invoiceId}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ market });
    });
    registerStatus(ctx, then);
  });
});
