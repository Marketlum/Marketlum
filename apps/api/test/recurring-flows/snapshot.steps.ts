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

const snapshotFeature = loadFeature(
  path.resolve(
    __dirname,
    '../../../../packages/bdd/features/recurring-flows/snapshot-recurring-flow.feature',
  ),
);

interface Ctx {
  authCookie: string;
  valueIds: Map<string, string>;
  valueStreamId: string;
  counterpartyAgentId: string;
  flowId: string;
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

async function createAgent(ctx: Ctx): Promise<string> {
  const res = await request(getApp().getHttpServer())
    .post('/agents')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name: 'Counterparty', type: 'organization' });
  return res.body.id;
}

async function createValueStream(ctx: Ctx): Promise<string> {
  const res = await request(getApp().getHttpServer())
    .post('/value-streams')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name: 'Test stream' });
  return res.body.id;
}

async function setBaseValue(ctx: Ctx, name: string) {
  await request(getApp().getHttpServer())
    .put('/system-settings/base-value')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ baseValueId: ctx.valueIds.get(name)! });
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
  valueName: string | null,
  amount: string,
): Promise<request.Response> {
  return request(getApp().getHttpServer())
    .post('/recurring-flows')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({
      valueStreamId: ctx.valueStreamId,
      counterpartyAgentId: ctx.counterpartyAgentId,
      valueId: valueName ? ctx.valueIds.get(valueName) : null,
      direction: 'inbound',
      amount,
      unit: 'USD',
      frequency: 'monthly',
      interval: 1,
      startDate: new Date().toISOString().slice(0, 10),
    });
}

function makeCtx(): Ctx {
  return {
    authCookie: '',
    valueIds: new Map(),
    valueStreamId: '',
    counterpartyAgentId: '',
    flowId: '',
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
    ctx.counterpartyAgentId = await createAgent(ctx);
    ctx.valueStreamId = await createValueStream(ctx);
  });
  steps.and(/^a value exists named "(.*)"$/, async (name: string) => {
    await ensureValue(ctx, name);
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
}

defineFeature(snapshotFeature, (test) => {
  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
  });
  afterAll(async () => {
    await teardownApp();
  });

  test('Recurring flow with no value has a null snapshot', ({
    given,
    when,
    then,
    and,
  }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });

    when(
      /^I create a recurring flow with no value and amount "(.*)"$/,
      async (amount: string) => {
        ctx.response = await createFlow(ctx, null, amount);
      },
    );
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the flow rateUsed should be null$/, () => {
      expect(ctx.response.body.rateUsed).toBeNull();
    });
    and(/^the flow baseAmount should be null$/, () => {
      expect(ctx.response.body.baseAmount).toBeNull();
    });
  });

  test('Recurring flow in the base value snapshots at rate 1', ({
    given,
    when,
    then,
    and,
  }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });

    when(
      /^I create a recurring flow with value "(.*)" and amount "(.*)"$/,
      async (valueName: string, amount: string) => {
        ctx.response = await createFlow(ctx, valueName, amount);
      },
    );
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the flow rateUsed should be "(.*)"$/, (value: string) => {
      expect(ctx.response.body.rateUsed).toBe(value);
    });
    and(/^the flow baseAmount should be "(.*)"$/, (value: string) => {
      expect(ctx.response.body.baseAmount).toBe(value);
    });
  });

  test('Recurring flow in a non-base value snapshots using the inverse rate', ({
    given,
    when,
    then,
    and,
  }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });

    when(
      /^I create a recurring flow with value "(.*)" and amount "(.*)"$/,
      async (valueName: string, amount: string) => {
        ctx.response = await createFlow(ctx, valueName, amount);
      },
    );
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the flow rateUsed should be "(.*)"$/, (value: string) => {
      expect(ctx.response.body.rateUsed).toBe(value);
    });
    and(/^the flow baseAmount should be "(.*)"$/, (value: string) => {
      expect(ctx.response.body.baseAmount).toBe(value);
    });
  });

  test('Recurring flow in a value with no rate snapshots as NULL', ({
    given,
    when,
    then,
    and,
  }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });

    when(
      /^I create a recurring flow with value "(.*)" and amount "(.*)"$/,
      async (valueName: string, amount: string) => {
        ctx.response = await createFlow(ctx, valueName, amount);
      },
    );
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the flow rateUsed should be null$/, () => {
      expect(ctx.response.body.rateUsed).toBeNull();
    });
    and(/^the flow baseAmount should be null$/, () => {
      expect(ctx.response.body.baseAmount).toBeNull();
    });
  });

  test('Changing the flow amount re-snapshots', ({
    given,
    when,
    then,
    and,
  }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });

    and(
      /^I created a recurring flow with value "(.*)" and amount "(.*)"$/,
      async (valueName: string, amount: string) => {
        ctx.response = await createFlow(ctx, valueName, amount);
        ctx.flowId = ctx.response.body.id;
      },
    );
    when(/^I update the flow amount to "(.*)"$/, async (amount: string) => {
      ctx.response = await request(getApp().getHttpServer())
        .patch(`/recurring-flows/${ctx.flowId}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ amount });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the flow rateUsed should be "(.*)"$/, (value: string) => {
      expect(ctx.response.body.rateUsed).toBe(value);
    });
    and(/^the flow baseAmount should be "(.*)"$/, (value: string) => {
      expect(ctx.response.body.baseAmount).toBe(value);
    });
  });

  test('Changing the flow value re-snapshots', ({ given, when, then, and }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });

    and(
      /^I created a recurring flow with value "(.*)" and amount "(.*)"$/,
      async (valueName: string, amount: string) => {
        ctx.response = await createFlow(ctx, valueName, amount);
        ctx.flowId = ctx.response.body.id;
      },
    );
    when(/^I update the flow value to "(.*)"$/, async (valueName: string) => {
      ctx.response = await request(getApp().getHttpServer())
        .patch(`/recurring-flows/${ctx.flowId}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ valueId: ctx.valueIds.get(valueName) });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the flow rateUsed should be "(.*)"$/, (value: string) => {
      expect(ctx.response.body.rateUsed).toBe(value);
    });
    and(/^the flow baseAmount should be "(.*)"$/, (value: string) => {
      expect(ctx.response.body.baseAmount).toBe(value);
    });
  });

  test('Editing pure metadata leaves the snapshot untouched', ({
    given,
    when,
    then,
    and,
  }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });

    and(
      /^I created a recurring flow with value "(.*)" and amount "(.*)"$/,
      async (valueName: string, amount: string) => {
        ctx.response = await createFlow(ctx, valueName, amount);
        ctx.flowId = ctx.response.body.id;
      },
    );
    when('I update the flow description without changing monetary fields', async () => {
      ctx.response = await request(getApp().getHttpServer())
        .patch(`/recurring-flows/${ctx.flowId}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ description: 'changed description' });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the flow rateUsed should be "(.*)"$/, (value: string) => {
      expect(ctx.response.body.rateUsed).toBe(value);
    });
    and(/^the flow baseAmount should be "(.*)"$/, (value: string) => {
      expect(ctx.response.body.baseAmount).toBe(value);
    });
  });
});
