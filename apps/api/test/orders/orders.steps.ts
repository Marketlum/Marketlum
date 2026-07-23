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
import { expectEventWithId, expectNoEventMatching } from '../events/event-steps';

const featuresDir = path.resolve(__dirname, '../../../../packages/bdd/features/orders');
const manageFeature = loadFeature(path.join(featuresDir, 'manage-orders.feature'));
const lifecycleFeature = loadFeature(path.join(featuresDir, 'order-lifecycle.feature'));
const itemsFeature = loadFeature(path.join(featuresDir, 'order-items.feature'));
const addressesFeature = loadFeature(path.join(featuresDir, 'order-addresses.feature'));
const searchFeature = loadFeature(path.join(featuresDir, 'search-orders.feature'));
const invoicesFeature = loadFeature(path.join(featuresDir, 'order-invoices.feature'));
const generateInvoiceFeature = loadFeature(
  path.join(featuresDir, 'order-generate-invoice.feature'),
);
const eventsFeature = loadFeature(path.join(featuresDir, 'order-events.feature'));

const ORDER_NUMBER_FORMAT = /^ORD-\d{5,}$/;

type StepFn = (regex: RegExp | string, fn: (...args: never[]) => unknown) => void;

interface Ctx {
  response: request.Response;
  authCookie: string;
  agentIds: Map<string, string>;
  valueIds: Map<string, string>;
  valueInstanceIds: Map<string, string>;
  channelIds: Map<string, string>;
  pipelineIds: Map<string, string>;
  localeIds: Map<string, string>;
  invoiceIds: Map<string, string>;
  orderIds: string[];
  orderNumbers: string[];
}

function makeCtx(): Ctx {
  return {
    response: undefined as unknown as request.Response,
    authCookie: '',
    agentIds: new Map(),
    valueIds: new Map(),
    valueInstanceIds: new Map(),
    channelIds: new Map(),
    pipelineIds: new Map(),
    localeIds: new Map(),
    invoiceIds: new Map(),
    orderIds: [],
    orderNumbers: [],
  };
}

const ctx: Ctx = makeCtx();

function server() {
  return getApp().getHttpServer();
}

function authedPost(url: string) {
  return request(server())
    .post(url)
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1');
}

function authedPatch(url: string) {
  return request(server())
    .patch(url)
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1');
}

async function createAgent(name: string): Promise<void> {
  const res = await authedPost('/agents').send({ name, type: 'organization' });
  ctx.agentIds.set(name, res.body.id);
}

async function createCurrencyValue(name: string): Promise<void> {
  const res = await authedPost('/values').send({ name, type: 'currency' });
  ctx.valueIds.set(name, res.body.id);
}

async function createProductValue(name: string): Promise<void> {
  const res = await authedPost('/values').send({ name, type: 'product' });
  ctx.valueIds.set(name, res.body.id);
}

async function createValueInstance(name: string, valueName: string): Promise<void> {
  const res = await authedPost('/value-instances').send({
    name,
    valueId: ctx.valueIds.get(valueName),
  });
  ctx.valueInstanceIds.set(name, res.body.id);
}

async function createChannel(name: string): Promise<void> {
  const res = await authedPost('/channels').send({ name, color: '#ff0000' });
  ctx.channelIds.set(name, res.body.id);
}

async function createPipeline(name: string): Promise<void> {
  const res = await authedPost('/pipelines').send({
    code: name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    name,
    color: '#00ff00',
  });
  ctx.pipelineIds.set(name, res.body.id);
}

async function createLocale(code: string): Promise<void> {
  const res = await authedPost('/locales').send({ code });
  ctx.localeIds.set(code, res.body.id);
}

async function createOrder(
  fromAgentName: string,
  toAgentName: string,
  currencyName: string,
  extra: Record<string, unknown> = {},
): Promise<request.Response> {
  const res = await authedPost('/orders').send({
    fromAgentId: ctx.agentIds.get(fromAgentName),
    toAgentId: ctx.agentIds.get(toAgentName),
    currencyId: ctx.valueIds.get(currencyName),
    ...extra,
  });
  if (res.status === 201) {
    ctx.orderIds.push(res.body.id);
    ctx.orderNumbers.push(res.body.number);
  }
  return res;
}

function currentOrderId(): string {
  return ctx.orderIds[ctx.orderIds.length - 1];
}

async function transitionOrder(action: string, id?: string): Promise<request.Response> {
  return authedPost(`/orders/${id ?? currentOrderId()}/${action}`).send({});
}

async function updateOrder(body: Record<string, unknown>): Promise<request.Response> {
  return authedPatch(`/orders/${currentOrderId()}`).send(body);
}

interface ItemRow {
  value: string;
  valueInstance: string;
  quantity: string;
  unitPrice: string;
}

function itemsFromTable(table: ItemRow[]): Record<string, unknown>[] {
  return table.map((row) => ({
    valueId: row.value ? ctx.valueIds.get(row.value) : null,
    valueInstanceId: row.valueInstance ? ctx.valueInstanceIds.get(row.valueInstance) : null,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
  }));
}

const address = (city: string) => ({
  countryCode: 'DE',
  line1: 'Example Street 1',
  city,
  postalCode: '10115',
});

async function createInvoice(
  number: string,
  currencyName: string,
  opts: { orderId?: string; total?: string } = {},
): Promise<request.Response> {
  const body: Record<string, unknown> = {
    number,
    fromAgentId: ctx.agentIds.get('Seller Corp'),
    toAgentId: ctx.agentIds.get('Buyer Inc'),
    issuedAt: '2025-01-15T00:00:00.000Z',
    dueAt: '2025-02-15T00:00:00.000Z',
    currencyId: ctx.valueIds.get(currencyName),
  };
  if (opts.orderId) body.orderId = opts.orderId;
  if (opts.total) {
    body.items = [{ quantity: '1', unitPrice: opts.total, total: opts.total }];
  }
  const res = await authedPost('/invoices').send(body);
  if (res.status === 201) ctx.invoiceIds.set(number, res.body.id);
  return res;
}

// --- shared step registrations ---

function registerAuth(step: StepFn) {
  step(/^I am authenticated as "(.*)"$/, async (email: string) => {
    ctx.authCookie = await createAuthenticatedUser(email, 'password123');
  });
}

function registerAgentExists(step: StepFn) {
  step(/^an agent exists with name "(.*)"$/, async (name: string) => {
    await createAgent(name);
  });
}

function registerCurrencyExists(step: StepFn) {
  step(/^a currency value exists with name "(.*)"$/, async (name: string) => {
    await createCurrencyValue(name);
  });
}

function registerValueExists(step: StepFn) {
  step(/^a value exists with name "(.*)"$/, async (name: string) => {
    await createProductValue(name);
  });
}

function registerOrderExists(step: StepFn) {
  step(
    /^an order exists from "(.*)" to "(.*)" in currency "(.*)"$/,
    async (from: string, to: string, currency: string) => {
      const res = await createOrder(from, to, currency);
      expect(res.status).toBe(201);
    },
  );
}

function registerOrderTransitioned(step: StepFn, phrase: string, action: string) {
  step(new RegExp(`^the order is ${phrase}$`), async () => {
    const res = await transitionOrder(action);
    expect(res.status).toBe(200);
  });
}

function registerStatus(then: StepFn) {
  then(/^the response status should be (\d+)$/, (status: string) => {
    expect(ctx.response.status).toBe(Number(status));
  });
}

function registerOrderState(step: StepFn) {
  step(/^the response should contain an order with state "(.*)"$/, (state: string) => {
    expect(ctx.response.body.state).toBe(state);
  });
}

function registerTimestamp(step: StepFn, field: 'placedAt' | 'completedAt' | 'cancelledAt') {
  step(new RegExp(`^the response should contain a ${field} timestamp$`), () => {
    expect(ctx.response.body[field]).toEqual(expect.any(String));
  });
}

function registerChannelInResponse(step: StepFn) {
  step(/^the response should contain a channel with name "(.*)"$/, (name: string) => {
    expect(ctx.response.body.channel.name).toBe(name);
  });
}

function registerUpdateWithAddresses(when: StepFn) {
  when(
    /^I update the order with a shipping address in "(.*)" and a billing address in "(.*)"$/,
    async (shippingCity: string, billingCity: string) => {
      ctx.response = await updateOrder({
        shippingAddress: address(shippingCity),
        billingAddress: address(billingCity),
      });
    },
  );
}

function registerUpdateWithItemsTable(when: StepFn) {
  when('I update the order with items:', async (table: ItemRow[]) => {
    ctx.response = await updateOrder({ items: itemsFromTable(table) });
  });
}

function registerDeleteOrder(when: StepFn) {
  when(/^I delete the order$/, async () => {
    ctx.response = await request(server())
      .delete(`/orders/${currentOrderId()}`)
      .set('Cookie', [ctx.authCookie])
      .set('X-CSRF-Protection', '1');
  });
}

function registerEventWithId(step: StepFn) {
  step(/^the event "(.*)" was published with the entity's id$/, (eventName: string) => {
    expectEventWithId(eventName);
  });
}

// --- MANAGE ORDERS ---
defineFeature(manageFeature, (test) => {
  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    Object.assign(ctx, makeCtx());
  });
  afterAll(async () => {
    await teardownApp();
  });

  function registerCreateOrder(when: StepFn, word = '') {
    when(
      new RegExp(`^I create an${word} order from "(.*)" to "(.*)" in currency "(.*)"$`),
      async (from: string, to: string, currency: string) => {
        ctx.response = await createOrder(from, to, currency);
      },
    );
  }

  test('Create a draft order with required references', ({ given, and, when, then }) => {
    registerAuth(given);
    registerAgentExists(and);
    registerAgentExists(and);
    registerCurrencyExists(and);
    registerCreateOrder(when);
    registerStatus(then);
    registerOrderState(and);
    and(/^the order number matches the order number format$/, () => {
      expect(ctx.response.body.number).toMatch(ORDER_NUMBER_FORMAT);
    });
    and(/^the response should contain a fromAgent with name "(.*)"$/, (name: string) => {
      expect(ctx.response.body.fromAgent.name).toBe(name);
    });
    and(/^the response should contain a toAgent with name "(.*)"$/, (name: string) => {
      expect(ctx.response.body.toAgent.name).toBe(name);
    });
    and(/^the response should contain a currency with name "(.*)"$/, (name: string) => {
      expect(ctx.response.body.currency.name).toBe(name);
    });
  });

  test('Order numbers are generated and unique', ({ given, and, when, then }) => {
    registerAuth(given);
    registerAgentExists(and);
    registerAgentExists(and);
    registerCurrencyExists(and);
    registerCreateOrder(when);
    registerCreateOrder(and, 'other');
    registerStatus(then);
    and(/^the two order numbers are distinct and match the order number format$/, () => {
      expect(ctx.orderNumbers).toHaveLength(2);
      expect(ctx.orderNumbers[0]).toMatch(ORDER_NUMBER_FORMAT);
      expect(ctx.orderNumbers[1]).toMatch(ORDER_NUMBER_FORMAT);
      expect(ctx.orderNumbers[0]).not.toBe(ctx.orderNumbers[1]);
    });
  });

  test('Create an order with channel, pipeline and locale', ({ given, and, when, then }) => {
    registerAuth(given);
    registerAgentExists(and);
    registerAgentExists(and);
    registerCurrencyExists(and);
    and(/^a channel exists with name "(.*)"$/, async (name: string) => {
      await createChannel(name);
    });
    and(/^a pipeline exists with name "(.*)"$/, async (name: string) => {
      await createPipeline(name);
    });
    and(/^a locale exists with code "(.*)"$/, async (code: string) => {
      await createLocale(code);
    });
    when(
      /^I create an order with channel "(.*)", pipeline "(.*)" and locale "(.*)"$/,
      async (channel: string, pipeline: string, locale: string) => {
        ctx.response = await createOrder('Seller Corp', 'Buyer Inc', 'USD', {
          channelId: ctx.channelIds.get(channel),
          pipelineId: ctx.pipelineIds.get(pipeline),
          localeId: ctx.localeIds.get(locale),
        });
      },
    );
    registerStatus(then);
    registerChannelInResponse(and);
    and(/^the response should contain a pipeline with name "(.*)"$/, (name: string) => {
      expect(ctx.response.body.pipeline.name).toBe(name);
    });
    and(/^the response should contain a locale with code "(.*)"$/, (code: string) => {
      expect(ctx.response.body.locale.code).toBe(code);
    });
  });

  test('Reject an unknown fromAgent', ({ given, and, when, then }) => {
    registerAuth(given);
    registerAgentExists(and);
    registerCurrencyExists(and);
    when(/^I create an order with a non-existent fromAgent$/, async () => {
      ctx.response = await authedPost('/orders').send({
        fromAgentId: '00000000-0000-0000-0000-000000000000',
        toAgentId: ctx.agentIds.get('Buyer Inc'),
        currencyId: ctx.valueIds.get('USD'),
      });
    });
    registerStatus(then);
  });

  test('Reject a non-currency value as the order currency', ({ given, and, when, then }) => {
    registerAuth(given);
    registerAgentExists(and);
    registerAgentExists(and);
    registerValueExists(and);
    registerCreateOrder(when);
    registerStatus(then);
  });

  test('Reject an empty body', ({ given, when, then }) => {
    registerAuth(given);
    when(/^I create an order with an empty body$/, async () => {
      ctx.response = await authedPost('/orders').send({});
    });
    registerStatus(then);
  });

  test('Update a draft order', ({ given, and, when, then }) => {
    registerAuth(given);
    registerAgentExists(and);
    registerAgentExists(and);
    registerCurrencyExists(and);
    and(/^a channel exists with name "(.*)"$/, async (name: string) => {
      await createChannel(name);
    });
    registerOrderExists(and);
    when(/^I update the order with channel "(.*)"$/, async (name: string) => {
      ctx.response = await updateOrder({ channelId: ctx.channelIds.get(name) });
    });
    registerStatus(then);
    registerChannelInResponse(and);
  });

  test('Reject updating a placed order', ({ given, and, when, then }) => {
    registerAuth(given);
    registerAgentExists(and);
    registerAgentExists(and);
    registerCurrencyExists(and);
    and(/^a channel exists with name "(.*)"$/, async (name: string) => {
      await createChannel(name);
    });
    registerOrderExists(and);
    registerOrderTransitioned(and, 'placed', 'place');
    when(/^I update the order with channel "(.*)"$/, async (name: string) => {
      ctx.response = await updateOrder({ channelId: ctx.channelIds.get(name) });
    });
    registerStatus(then);
  });

  test('Delete a draft order', ({ given, and, when, then }) => {
    registerAuth(given);
    registerAgentExists(and);
    registerAgentExists(and);
    registerCurrencyExists(and);
    registerOrderExists(and);
    registerDeleteOrder(when);
    registerStatus(then);
  });

  test('Reject deleting a placed order', ({ given, and, when, then }) => {
    registerAuth(given);
    registerAgentExists(and);
    registerAgentExists(and);
    registerCurrencyExists(and);
    registerOrderExists(and);
    registerOrderTransitioned(and, 'placed', 'place');
    registerDeleteOrder(when);
    registerStatus(then);
  });

  test('Delete a cancelled order', ({ given, and, when, then }) => {
    registerAuth(given);
    registerAgentExists(and);
    registerAgentExists(and);
    registerCurrencyExists(and);
    registerOrderExists(and);
    registerOrderTransitioned(and, 'cancelled', 'cancel');
    registerDeleteOrder(when);
    registerStatus(then);
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I create an order without authentication$/, async () => {
      ctx.response = await request(server())
        .post('/orders')
        .set('X-CSRF-Protection', '1')
        .send({});
    });
    registerStatus(then);
  });
});

// --- ORDER LIFECYCLE ---
defineFeature(lifecycleFeature, (test) => {
  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    Object.assign(ctx, makeCtx());
  });
  afterAll(async () => {
    await teardownApp();
  });

  function registerBackground(given: StepFn, and: StepFn) {
    registerAuth(given);
    registerAgentExists(and);
    registerAgentExists(and);
    registerCurrencyExists(and);
    registerOrderExists(and);
  }

  function registerTransitionWhen(when: StepFn, verb: string, action: string) {
    when(new RegExp(`^I ${verb} the order$`), async () => {
      ctx.response = await transitionOrder(action);
    });
  }

  test('Place a draft order', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerTransitionWhen(when, 'place', 'place');
    registerStatus(then);
    registerOrderState(and);
    registerTimestamp(and, 'placedAt');
  });

  test('Start a new order', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerOrderTransitioned(given, 'placed', 'place');
    registerTransitionWhen(when, 'start', 'start');
    registerStatus(then);
    registerOrderState(and);
  });

  test('Complete a processing order', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerOrderTransitioned(given, 'placed', 'place');
    registerOrderTransitioned(and, 'started', 'start');
    registerTransitionWhen(when, 'complete', 'complete');
    registerStatus(then);
    registerOrderState(and);
    registerTimestamp(and, 'completedAt');
  });

  test('Cancel a draft order', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerTransitionWhen(when, 'cancel', 'cancel');
    registerStatus(then);
    registerOrderState(and);
    registerTimestamp(and, 'cancelledAt');
  });

  test('Cancel a new order', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerOrderTransitioned(given, 'placed', 'place');
    registerTransitionWhen(when, 'cancel', 'cancel');
    registerStatus(then);
    registerOrderState(and);
  });

  test('Cancel a processing order', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerOrderTransitioned(given, 'placed', 'place');
    registerOrderTransitioned(and, 'started', 'start');
    registerTransitionWhen(when, 'cancel', 'cancel');
    registerStatus(then);
    registerOrderState(and);
  });

  test('Reject completing a draft order', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerTransitionWhen(when, 'complete', 'complete');
    registerStatus(then);
  });

  test('Reject placing an order twice', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerOrderTransitioned(given, 'placed', 'place');
    registerTransitionWhen(when, 'place', 'place');
    registerStatus(then);
  });

  test('Reject cancelling a completed order', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerOrderTransitioned(given, 'placed', 'place');
    registerOrderTransitioned(and, 'started', 'start');
    registerOrderTransitioned(and, 'completed', 'complete');
    registerTransitionWhen(when, 'cancel', 'cancel');
    registerStatus(then);
  });

  test('Transitioning a non-existent order returns 404', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(/^I place the order with ID "(.*)"$/, async (id: string) => {
      ctx.response = await transitionOrder('place', id);
    });
    registerStatus(then);
  });
});

// --- ORDER ITEMS ---
defineFeature(itemsFeature, (test) => {
  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    Object.assign(ctx, makeCtx());
  });
  afterAll(async () => {
    await teardownApp();
  });

  function registerBackground(given: StepFn, and: StepFn) {
    registerAuth(given);
    registerAgentExists(and);
    registerAgentExists(and);
    registerCurrencyExists(and);
    registerValueExists(and);
    and(
      /^a value instance exists with name "(.*)" for value "(.*)"$/,
      async (name: string, valueName: string) => {
        await createValueInstance(name, valueName);
      },
    );
    registerOrderExists(and);
  }

  function registerItemCount(step: StepFn) {
    step(/^the response should contain (\d+) items$/, (count: string) => {
      expect(ctx.response.body.items).toHaveLength(Number(count));
    });
  }

  function registerOrderTotal(step: StepFn) {
    step(/^the order total should be "(.*)"$/, (total: string) => {
      expect(ctx.response.body.total).toBe(total);
    });
  }

  test('Add items to a draft order', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerUpdateWithItemsTable(when);
    registerStatus(then);
    registerItemCount(and);
    const itemTotal = (step: StepFn) =>
      step(/^the order item (\d+) total should be "(.*)"$/, (index: string, total: string) => {
        expect(ctx.response.body.items[Number(index) - 1].total).toBe(total);
      });
    itemTotal(and);
    itemTotal(and);
    registerOrderTotal(and);
    and(
      /^the order item (\d+) should reference value "(.*)" and instance "(.*)"$/,
      (index: string, valueName: string, instanceName: string) => {
        const item = ctx.response.body.items[Number(index) - 1];
        expect(item.value.name).toBe(valueName);
        expect(item.valueInstance.name).toBe(instanceName);
      },
    );
  });

  test('Replacing items discards the previous ones', ({ given, and, when, then }) => {
    registerBackground(given, and);
    given('the order has items:', async (table: ItemRow[]) => {
      const res = await updateOrder({ items: itemsFromTable(table) });
      expect(res.status).toBe(200);
    });
    registerUpdateWithItemsTable(when);
    registerStatus(then);
    registerItemCount(and);
    registerOrderTotal(and);
  });

  test('Reject an item referencing an unknown value', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(/^I update the order with an item referencing a non-existent value$/, async () => {
      ctx.response = await updateOrder({
        items: [
          {
            valueId: '00000000-0000-0000-0000-000000000000',
            quantity: '1',
            unitPrice: '10.00',
          },
        ],
      });
    });
    registerStatus(then);
  });

  test('Reject replacing items once the order is placed', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerOrderTransitioned(given, 'placed', 'place');
    registerUpdateWithItemsTable(when);
    registerStatus(then);
  });
});

// --- ORDER ADDRESSES ---
defineFeature(addressesFeature, (test) => {
  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    Object.assign(ctx, makeCtx());
  });
  afterAll(async () => {
    await teardownApp();
  });

  function registerBackground(given: StepFn, and: StepFn) {
    registerAuth(given);
    registerAgentExists(and);
    registerAgentExists(and);
    registerCurrencyExists(and);
    registerOrderExists(and);
  }

  test('Set shipping and billing addresses on a draft order', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerUpdateWithAddresses(when);
    registerStatus(then);
    and(/^the order shipping address city should be "(.*)"$/, (city: string) => {
      expect(ctx.response.body.shippingAddress.city).toBe(city);
    });
    and(/^the order billing address city should be "(.*)"$/, (city: string) => {
      expect(ctx.response.body.billingAddress.city).toBe(city);
    });
  });

  test('Clear the shipping address', ({ given, and, when, then }) => {
    registerBackground(given, and);
    given(/^the order has a shipping address in "(.*)"$/, async (city: string) => {
      const res = await updateOrder({ shippingAddress: address(city) });
      expect(res.status).toBe(200);
    });
    when(/^I update the order with a null shipping address$/, async () => {
      ctx.response = await updateOrder({ shippingAddress: null });
    });
    registerStatus(then);
    and(/^the order shipping address should be empty$/, () => {
      expect(ctx.response.body.shippingAddress).toBeNull();
    });
  });

  test('Reject an incomplete address', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(/^I update the order with a shipping address missing the city$/, async () => {
      const { city, ...incomplete } = address('Berlin');
      void city;
      ctx.response = await updateOrder({ shippingAddress: incomplete });
    });
    registerStatus(then);
  });

  test('Reject address changes once the order is placed', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerOrderTransitioned(given, 'placed', 'place');
    registerUpdateWithAddresses(when);
    registerStatus(then);
  });
});

// --- SEARCH ORDERS ---
defineFeature(searchFeature, (test) => {
  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    Object.assign(ctx, makeCtx());
  });
  afterAll(async () => {
    await teardownApp();
  });

  function registerBackground(given: StepFn, and: StepFn) {
    registerAuth(given);
    registerAgentExists(and);
    registerAgentExists(and);
    registerAgentExists(and);
    registerCurrencyExists(and);
    and(/^a pipeline exists with name "(.*)"$/, async (name: string) => {
      await createPipeline(name);
    });
    registerOrderExists(and);
    and(
      /^an order exists from "(.*)" to "(.*)" in currency "(.*)" with pipeline "(.*)"$/,
      async (from: string, to: string, currency: string, pipeline: string) => {
        const res = await createOrder(from, to, currency, {
          pipelineId: ctx.pipelineIds.get(pipeline),
        });
        expect(res.status).toBe(201);
      },
    );
  }

  async function searchOrders(params: Record<string, string | number>) {
    return request(server())
      .get('/orders/search')
      .query(params)
      .set('Cookie', [ctx.authCookie]);
  }

  function registerResultCount(step: StepFn) {
    step(/^the search result should contain (\d+) orders$/, (count: string) => {
      expect(ctx.response.body.data).toHaveLength(Number(count));
    });
  }

  test('List all orders', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(/^I search orders$/, async () => {
      ctx.response = await searchOrders({});
    });
    registerStatus(then);
    registerResultCount(and);
  });

  test('Filter orders by state', ({ given, and, when, then }) => {
    registerBackground(given, and);
    given(/^the last order is placed$/, async () => {
      const res = await transitionOrder('place');
      expect(res.status).toBe(200);
    });
    when(/^I search orders with state "(.*)"$/, async (state: string) => {
      ctx.response = await searchOrders({ state });
    });
    registerStatus(then);
    registerResultCount(and);
  });

  test('Filter orders by fromAgent', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(/^I search orders with fromAgent "(.*)"$/, async (name: string) => {
      ctx.response = await searchOrders({ fromAgentId: ctx.agentIds.get(name)! });
    });
    registerStatus(then);
    registerResultCount(and);
  });

  test('Filter orders by agent on either side', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(/^I search orders involving agent "(.*)"$/, async (name: string) => {
      ctx.response = await searchOrders({ agentId: ctx.agentIds.get(name)! });
    });
    registerStatus(then);
    registerResultCount(and);
  });

  test('Filter orders by pipeline', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(/^I search orders with pipeline "(.*)"$/, async (name: string) => {
      ctx.response = await searchOrders({ pipelineId: ctx.pipelineIds.get(name)! });
    });
    registerStatus(then);
    registerResultCount(and);
  });

  test("Search orders by number", ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(/^I search orders by the first order's number$/, async () => {
      ctx.response = await searchOrders({ search: ctx.orderNumbers[0] });
    });
    registerStatus(then);
    registerResultCount(and);
  });

  test('Paginate orders', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(/^I search orders with page (\d+) and limit (\d+)$/, async (page: string, limit: string) => {
      ctx.response = await searchOrders({ page: Number(page), limit: Number(limit) });
    });
    registerStatus(then);
    registerResultCount(and);
    and(/^the search meta should report a total of (\d+)$/, (total: string) => {
      expect(ctx.response.body.meta.total).toBe(Number(total));
    });
  });
});

// --- ORDER INVOICES ---
defineFeature(invoicesFeature, (test) => {
  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    Object.assign(ctx, makeCtx());
  });
  afterAll(async () => {
    await teardownApp();
  });

  function registerBackground(given: StepFn, and: StepFn) {
    registerAuth(given);
    registerAgentExists(and);
    registerAgentExists(and);
    registerCurrencyExists(and);
    registerCurrencyExists(and);
    registerOrderExists(and);
  }

  function registerInvoiceExists(step: StepFn) {
    step(
      /^an invoice exists with number "(.*)" in currency "(.*)"$/,
      async (number: string, currency: string) => {
        const res = await createInvoice(number, currency);
        expect(res.status).toBe(201);
      },
    );
  }

  function registerLinkedInvoiceExists(step: StepFn) {
    step(
      /^an invoice exists with number "(.*)" in currency "(.*)" linked to the order$/,
      async (number: string, currency: string) => {
        const res = await createInvoice(number, currency, { orderId: currentOrderId() });
        expect(res.status).toBe(201);
      },
    );
  }

  function registerLinkWhen(when: StepFn) {
    when(/^I link the invoice "(.*)" to the order$/, async (number: string) => {
      ctx.response = await authedPatch(`/invoices/${ctx.invoiceIds.get(number)}`).send({
        orderId: currentOrderId(),
      });
    });
  }

  function registerReferencesOrder(step: StepFn) {
    step(/^the invoice response should reference the order$/, () => {
      expect(ctx.response.body.order).toBeTruthy();
      expect(ctx.response.body.order.id).toBe(currentOrderId());
      expect(ctx.response.body.order.number).toBe(ctx.orderNumbers[ctx.orderNumbers.length - 1]);
    });
  }

  function registerReferencesNoOrder(step: StepFn) {
    step(/^the invoice response should reference no order$/, () => {
      expect(ctx.response.body.order).toBeNull();
    });
  }

  test('Create an invoice linked to the order', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(
      /^I create an invoice with number "(.*)" in currency "(.*)" linked to the order$/,
      async (number: string, currency: string) => {
        ctx.response = await createInvoice(number, currency, { orderId: currentOrderId() });
      },
    );
    registerStatus(then);
    and(/^the invoice response should reference the order$/, () => {
      expect(ctx.response.body.orderId ?? ctx.response.body.order?.id).toBe(currentOrderId());
    });
  });

  test('Link an existing invoice to the order', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerInvoiceExists(given);
    registerLinkWhen(when);
    registerStatus(then);
    registerReferencesOrder(and);
  });

  test('Unlink an invoice from the order', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerLinkedInvoiceExists(given);
    when(/^I unlink the invoice "(.*)" from the order$/, async (number: string) => {
      ctx.response = await authedPatch(`/invoices/${ctx.invoiceIds.get(number)}`).send({
        orderId: null,
      });
    });
    registerStatus(then);
    registerReferencesNoOrder(and);
  });

  test('Reject linking an invoice with a different currency', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerInvoiceExists(given);
    registerLinkWhen(when);
    registerStatus(then);
  });

  test('Reject linking an invoice to a completed order', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerOrderTransitioned(given, 'placed', 'place');
    registerOrderTransitioned(and, 'started', 'start');
    registerOrderTransitioned(and, 'completed', 'complete');
    registerInvoiceExists(and);
    registerLinkWhen(when);
    registerStatus(then);
  });

  test('List invoices of an order', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerLinkedInvoiceExists(given);
    registerInvoiceExists(and);
    when(/^I search invoices of the order$/, async () => {
      ctx.response = await request(server())
        .get('/invoices/search')
        .query({ orderId: currentOrderId() })
        .set('Cookie', [ctx.authCookie]);
    });
    registerStatus(then);
    and(/^the search result should contain (\d+) invoices$/, (count: string) => {
      expect(ctx.response.body.data).toHaveLength(Number(count));
    });
  });

  test('The order detail exposes the invoiced total', ({ given, and, when, then }) => {
    registerBackground(given, and);
    const linkedWithTotal = (step: StepFn) =>
      step(
        /^an invoice exists with number "(.*)" in currency "(.*)" linked to the order with total "(.*)"$/,
        async (number: string, currency: string, total: string) => {
          const res = await createInvoice(number, currency, {
            orderId: currentOrderId(),
            total,
          });
          expect(res.status).toBe(201);
        },
      );
    linkedWithTotal(given);
    linkedWithTotal(and);
    when(/^I fetch the order$/, async () => {
      ctx.response = await request(server())
        .get(`/orders/${currentOrderId()}`)
        .set('Cookie', [ctx.authCookie]);
    });
    registerStatus(then);
    and(/^the order invoiced total should be "(.*)"$/, (total: string) => {
      expect(ctx.response.body.invoicedTotal).toBe(total);
    });
  });

  test('Deleting the order detaches its invoices', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerLinkedInvoiceExists(given);
    registerDeleteOrder(when);
    and(/^I fetch the invoice "(.*)"$/, async (number: string) => {
      ctx.response = await request(server())
        .get(`/invoices/${ctx.invoiceIds.get(number)}`)
        .set('Cookie', [ctx.authCookie]);
    });
    registerStatus(then);
    registerReferencesNoOrder(and);
  });
});

// --- GENERATE INVOICE FROM ORDER ---
defineFeature(generateInvoiceFeature, (test) => {
  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    Object.assign(ctx, makeCtx());
  });
  afterAll(async () => {
    await teardownApp();
  });

  function registerBackground(given: StepFn, and: StepFn) {
    registerAuth(given);
    registerAgentExists(and);
    registerAgentExists(and);
    registerCurrencyExists(and);
    registerValueExists(and);
    registerOrderExists(and);
  }

  function registerGenerateWhen(when: StepFn) {
    when(/^I generate an invoice for the order$/, async () => {
      ctx.response = await authedPost(`/orders/${currentOrderId()}/invoices`).send({});
    });
  }

  function registerNumberSuffix(step: StepFn) {
    step(
      /^the generated invoice number is the order number suffixed with "(.*)"$/,
      (suffix: string) => {
        const orderNumber = ctx.orderNumbers[ctx.orderNumbers.length - 1];
        expect(ctx.response.body.number).toBe(`${orderNumber}${suffix}`);
      },
    );
  }

  function registerItemCount(step: StepFn) {
    step(/^the response should contain (\d+) items$/, (count: string) => {
      expect(ctx.response.body.items).toHaveLength(Number(count));
    });
  }

  test("Generate an invoice copying the order's header and items", ({
    given,
    and,
    when,
    then,
  }) => {
    registerBackground(given, and);
    given('the order has items:', async (table: ItemRow[]) => {
      const res = await updateOrder({ items: itemsFromTable(table) });
      expect(res.status).toBe(200);
    });
    registerGenerateWhen(when);
    registerStatus(then);
    and(/^the invoice response should reference the order$/, () => {
      expect(ctx.response.body.order).toBeTruthy();
      expect(ctx.response.body.order.id).toBe(currentOrderId());
    });
    registerNumberSuffix(and);
    and(/^the response should contain a fromAgent with name "(.*)"$/, (name: string) => {
      expect(ctx.response.body.fromAgent.name).toBe(name);
    });
    and(/^the response should contain a toAgent with name "(.*)"$/, (name: string) => {
      expect(ctx.response.body.toAgent.name).toBe(name);
    });
    and(/^the response should contain a currency with name "(.*)"$/, (name: string) => {
      expect(ctx.response.body.currency.name).toBe(name);
    });
    registerItemCount(and);
    and(/^the invoice total should be "(.*)"$/, (total: string) => {
      expect(ctx.response.body.total).toBe(total);
    });
  });

  test('Generating again increments the invoice number suffix', ({
    given,
    and,
    when,
    then,
  }) => {
    registerBackground(given, and);
    given(/^an invoice has been generated for the order$/, async () => {
      const res = await authedPost(`/orders/${currentOrderId()}/invoices`).send({});
      expect(res.status).toBe(201);
    });
    registerGenerateWhen(when);
    registerStatus(then);
    registerNumberSuffix(and);
  });

  test('Generating for an order without items yields an empty invoice', ({
    given,
    and,
    when,
    then,
  }) => {
    registerBackground(given, and);
    registerGenerateWhen(when);
    registerStatus(then);
    registerItemCount(and);
    and(/^the invoice total should be "(.*)"$/, (total: string) => {
      expect(ctx.response.body.total).toBe(total);
    });
  });

  test('Generating for a completed order is rejected', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerOrderTransitioned(given, 'placed', 'place');
    registerOrderTransitioned(and, 'started', 'start');
    registerOrderTransitioned(and, 'completed', 'complete');
    registerGenerateWhen(when);
    registerStatus(then);
  });

  test('Generating for a cancelled order is rejected', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerOrderTransitioned(given, 'cancelled', 'cancel');
    registerGenerateWhen(when);
    registerStatus(then);
  });

  test('Generating for a non-existent order returns 404', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(/^I generate an invoice for the order with ID "(.*)"$/, async (id: string) => {
      ctx.response = await authedPost(`/orders/${id}/invoices`).send({});
    });
    registerStatus(then);
  });

  test('Generating an invoice publishes marketlum.invoice.created', ({
    given,
    and,
    when,
    then,
  }) => {
    registerBackground(given, and);
    registerGenerateWhen(when);
    registerStatus(then);
    registerEventWithId(and);
  });
});

// --- ORDER EVENTS ---
defineFeature(eventsFeature, (test) => {
  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    Object.assign(ctx, makeCtx());
  });
  afterAll(async () => {
    await teardownApp();
  });

  function registerBackground(given: StepFn, and: StepFn) {
    registerAuth(given);
    registerAgentExists(and);
    registerAgentExists(and);
    registerCurrencyExists(and);
  }

  test('Creating an order publishes marketlum.order.created and no item-level event', ({
    given,
    and,
    when,
    then,
  }) => {
    registerBackground(given, and);
    when(
      /^I create an order with one item from "(.*)" to "(.*)" in currency "(.*)"$/,
      async (from: string, to: string, currency: string) => {
        ctx.response = await createOrder(from, to, currency, {
          items: [{ quantity: '1', unitPrice: '10.00' }],
        });
      },
    );
    registerStatus(then);
    registerEventWithId(and);
    and(/^no event matching "(.*)" was published$/, (pattern: string) => {
      expectNoEventMatching(pattern);
    });
  });

  test('Updating an order publishes marketlum.order.updated', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerOrderExists(given);
    registerUpdateWithAddresses(when);
    registerStatus(then);
    registerEventWithId(and);
  });

  test('Placing an order publishes marketlum.order.updated', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerOrderExists(given);
    when(/^I place the order$/, async () => {
      ctx.response = await transitionOrder('place');
    });
    registerStatus(then);
    registerEventWithId(and);
  });

  test('Deleting an order publishes marketlum.order.deleted', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerOrderExists(given);
    registerDeleteOrder(when);
    registerStatus(then);
    registerEventWithId(and);
  });
});
