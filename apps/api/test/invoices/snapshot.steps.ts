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
    '../../../../packages/bdd/features/invoices/snapshot-invoice.feature',
  ),
);

interface Ctx {
  authCookie: string;
  valueIds: Map<string, string>;
  fromAgentId: string;
  toAgentId: string;
  invoiceId: string;
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

async function createAgent(ctx: Ctx, name: string): Promise<string> {
  const res = await request(getApp().getHttpServer())
    .post('/agents')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'organization' });
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

async function createInvoice(
  ctx: Ctx,
  currencyName: string,
  itemTotal: string,
): Promise<request.Response> {
  return request(getApp().getHttpServer())
    .post('/invoices')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({
      number: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      fromAgentId: ctx.fromAgentId,
      toAgentId: ctx.toAgentId,
      issuedAt: new Date().toISOString(),
      dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      currencyId: ctx.valueIds.get(currencyName),
      items: [
        {
          quantity: '1',
          unitPrice: itemTotal,
          total: itemTotal,
        },
      ],
    });
}

function makeCtx(): Ctx {
  return {
    authCookie: '',
    valueIds: new Map(),
    fromAgentId: '',
    toAgentId: '',
    invoiceId: '',
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
    ctx.fromAgentId = await createAgent(ctx, 'From Agent');
    ctx.toAgentId = await createAgent(ctx, 'To Agent');
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

  test('Invoice items in the base currency snapshot at rate 1', ({
    given,
    when,
    then,
    and,
  }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });

    when(
      /^I create an invoice in "(.*)" with one item totalling "(.*)"$/,
      async (currency: string, total: string) => {
        ctx.response = await createInvoice(ctx, currency, total);
      },
    );
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the item rateUsed should be "(.*)"$/, (value: string) => {
      expect(ctx.response.body.items[0].rateUsed).toBe(value);
    });
    and(/^the item baseAmount should be "(.*)"$/, (value: string) => {
      expect(ctx.response.body.items[0].baseAmount).toBe(value);
    });
    and(/^the invoice baseTotal should be "(.*)"$/, (value: string) => {
      expect(ctx.response.body.baseTotal).toBe(value);
    });
  });

  test('Invoice items in a non-base currency snapshot using the inverse rate', ({
    given,
    when,
    then,
    and,
  }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });

    when(
      /^I create an invoice in "(.*)" with one item totalling "(.*)"$/,
      async (currency: string, total: string) => {
        ctx.response = await createInvoice(ctx, currency, total);
      },
    );
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the item rateUsed should be "(.*)"$/, (value: string) => {
      expect(ctx.response.body.items[0].rateUsed).toBe(value);
    });
    and(/^the item baseAmount should be "(.*)"$/, (value: string) => {
      expect(ctx.response.body.items[0].baseAmount).toBe(value);
    });
    and(/^the invoice baseTotal should be "(.*)"$/, (value: string) => {
      expect(ctx.response.body.baseTotal).toBe(value);
    });
  });

  test('Invoice items in a currency with no rate snapshot as NULL', ({
    given,
    when,
    then,
    and,
  }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });

    when(
      /^I create an invoice in "(.*)" with one item totalling "(.*)"$/,
      async (currency: string, total: string) => {
        ctx.response = await createInvoice(ctx, currency, total);
      },
    );
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the item rateUsed should be null$/, () => {
      expect(ctx.response.body.items[0].rateUsed).toBeNull();
    });
    and(/^the item baseAmount should be null$/, () => {
      expect(ctx.response.body.items[0].baseAmount).toBeNull();
    });
    and(/^the invoice baseTotal should be null$/, () => {
      expect(ctx.response.body.baseTotal).toBeNull();
    });
  });

  test('Changing the invoice currency re-snapshots existing items', ({
    given,
    when,
    then,
    and,
  }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });

    and(
      /^I created an invoice in "(.*)" with one item totalling "(.*)"$/,
      async (currency: string, total: string) => {
        ctx.response = await createInvoice(ctx, currency, total);
        ctx.invoiceId = ctx.response.body.id;
      },
    );
    when(/^I update the invoice currency to "(.*)"$/, async (currency: string) => {
      ctx.response = await request(getApp().getHttpServer())
        .patch(`/invoices/${ctx.invoiceId}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ currencyId: ctx.valueIds.get(currency) });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the item rateUsed should be "(.*)"$/, (value: string) => {
      expect(ctx.response.body.items[0].rateUsed).toBe(value);
    });
    and(/^the item baseAmount should be "(.*)"$/, (value: string) => {
      expect(ctx.response.body.items[0].baseAmount).toBe(value);
    });
  });

  test('Resending items re-snapshots each item against the invoice currency', ({
    given,
    when,
    then,
    and,
  }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });

    and(
      /^I created an invoice in "(.*)" with one item totalling "(.*)"$/,
      async (currency: string, total: string) => {
        ctx.response = await createInvoice(ctx, currency, total);
        ctx.invoiceId = ctx.response.body.id;
      },
    );
    when(
      /^I update the invoice items so one item totals "(.*)"$/,
      async (total: string) => {
        ctx.response = await request(getApp().getHttpServer())
          .patch(`/invoices/${ctx.invoiceId}`)
          .set('Cookie', [ctx.authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            items: [
              {
                quantity: '1',
                unitPrice: total,
                total,
              },
            ],
          });
      },
    );
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the item rateUsed should be "(.*)"$/, (value: string) => {
      expect(ctx.response.body.items[0].rateUsed).toBe(value);
    });
    and(/^the item baseAmount should be "(.*)"$/, (value: string) => {
      expect(ctx.response.body.items[0].baseAmount).toBe(value);
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
      /^I created an invoice in "(.*)" with one item totalling "(.*)"$/,
      async (currency: string, total: string) => {
        ctx.response = await createInvoice(ctx, currency, total);
        ctx.invoiceId = ctx.response.body.id;
      },
    );
    when('I update the invoice paid flag without resending items', async () => {
      ctx.response = await request(getApp().getHttpServer())
        .patch(`/invoices/${ctx.invoiceId}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ paid: true });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the item rateUsed should be "(.*)"$/, (value: string) => {
      expect(ctx.response.body.items[0].rateUsed).toBe(value);
    });
    and(/^the item baseAmount should be "(.*)"$/, (value: string) => {
      expect(ctx.response.body.items[0].baseAmount).toBe(value);
    });
  });
});
