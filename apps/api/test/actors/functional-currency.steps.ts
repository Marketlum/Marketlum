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
    '../../../../packages/bdd/features/actors/functional-currency.feature',
  ),
);

interface Ctx {
  authCookie: string;
  values: Map<string, string>;
  actors: Map<string, string>;
  response: request.Response;
}

function makeCtx(): Ctx {
  return {
    authCookie: '',
    values: new Map(),
    actors: new Map(),
    response: {} as request.Response,
  };
}

async function ensureValue(ctx: Ctx, name: string, type: ValueType): Promise<string> {
  if (ctx.values.has(name)) return ctx.values.get(name)!;
  const res = await request(getApp().getHttpServer())
    .post('/values')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type, purpose: `Test value ${name}` });
  ctx.values.set(name, res.body.id);
  return res.body.id;
}

async function createActor(
  ctx: Ctx,
  name: string,
  options: { functionalCurrencyName?: string | null } = {},
): Promise<request.Response> {
  const body: Record<string, unknown> = { name, type: 'organization' };
  if (options.functionalCurrencyName !== undefined) {
    body.functionalCurrencyId =
      options.functionalCurrencyName === null
        ? null
        : ctx.values.get(options.functionalCurrencyName);
  }
  return request(getApp().getHttpServer())
    .post('/actors')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
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
      await ensureValue(ctx, name, ValueType.CURRENCY);
    });
    steps.and(/^a currency value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(ctx, name, ValueType.CURRENCY);
    });
  }

  test('Creating an actor with a functional currency', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    when(/^I create an actor named "(.*)" with functional currency "(.*)"$/,
      async (name: string, currency: string) => {
        ctx.response = await createActor(ctx, name, { functionalCurrencyName: currency });
      });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the actor functional currency should be "(.*)"$/, (currency: string) => {
      expect(ctx.response.body.functionalCurrency).not.toBeNull();
      expect(ctx.response.body.functionalCurrency.id).toBe(ctx.values.get(currency));
    });
  });

  test('Creating an actor without a functional currency is allowed', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    when(/^I create an actor named "(.*)" without a functional currency$/, async (name: string) => {
      ctx.response = await createActor(ctx, name);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and('the actor functional currency should be null', () => {
      expect(ctx.response.body.functionalCurrency).toBeNull();
    });
  });

  test("Updating an actor's functional currency", ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^an actor exists named "(.*)" with functional currency "(.*)"$/,
      async (name: string, currency: string) => {
        const res = await createActor(ctx, name, { functionalCurrencyName: currency });
        ctx.actors.set(name, res.body.id);
      });
    when(/^I update that actor's functional currency to "(.*)"$/, async (currency: string) => {
      const actorId = Array.from(ctx.actors.values())[0];
      ctx.response = await request(getApp().getHttpServer())
        .patch(`/actors/${actorId}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ functionalCurrencyId: ctx.values.get(currency) });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the actor functional currency should be "(.*)"$/, (currency: string) => {
      expect(ctx.response.body.functionalCurrency.id).toBe(ctx.values.get(currency));
    });
  });

  test("Clearing an actor's functional currency", ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^an actor exists named "(.*)" with functional currency "(.*)"$/,
      async (name: string, currency: string) => {
        const res = await createActor(ctx, name, { functionalCurrencyName: currency });
        ctx.actors.set(name, res.body.id);
      });
    when("I clear that actor's functional currency", async () => {
      const actorId = Array.from(ctx.actors.values())[0];
      ctx.response = await request(getApp().getHttpServer())
        .patch(`/actors/${actorId}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ functionalCurrencyId: null });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and('the actor functional currency should be null', () => {
      expect(ctx.response.body.functionalCurrency).toBeNull();
    });
  });

  test('Functional currency must reference a Value of type currency', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^a product value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(ctx, name, ValueType.PRODUCT);
    });
    when(/^I create an actor named "(.*)" with functional currency "(.*)"$/,
      async (name: string, currency: string) => {
        ctx.response = await createActor(ctx, name, { functionalCurrencyName: currency });
      });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
  });

  test('Snapshot references endpoint returns zero counts for an actor with no invoices', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^an actor exists named "(.*)" with functional currency "(.*)"$/,
      async (name: string, currency: string) => {
        const res = await createActor(ctx, name, { functionalCurrencyName: currency });
        ctx.actors.set(name, res.body.id);
      });
    when(/^I fetch the snapshot references for "(.*)"$/, async (name: string) => {
      const actorId = ctx.actors.get(name)!;
      ctx.response = await request(getApp().getHttpServer())
        .get(`/actors/${actorId}/snapshot-references`)
        .set('Cookie', [ctx.authCookie]);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the snapshot references invoiceItems should be (\d+)$/, (n: string) => {
      expect(ctx.response.body.invoiceItems).toBe(parseInt(n));
    });
  });
});
