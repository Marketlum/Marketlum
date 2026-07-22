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
  path.resolve(__dirname, '../../../../packages/bdd/features/invoices/market.feature'),
);

type StepFn = (regex: RegExp | string, fn: (...args: never[]) => unknown) => void;

defineFeature(feature, (test) => {
  let response: request.Response;
  let authCookie: string;
  const agentIds = new Map<string, string>();
  const valueIds = new Map<string, string>();
  const invoiceIds = new Map<string, string>();

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    agentIds.clear();
    valueIds.clear();
    invoiceIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  function server() {
    return getApp().getHttpServer();
  }

  async function createInvoice(number: string, market?: string): Promise<request.Response> {
    const body: Record<string, unknown> = {
      number,
      fromAgentId: agentIds.get('Seller Corp'),
      toAgentId: agentIds.get('Buyer Inc'),
      currencyId: valueIds.get('USD'),
      issuedAt: '2026-01-15T00:00:00.000Z',
      dueAt: '2026-02-15T00:00:00.000Z',
    };
    if (market !== undefined) body.market = market;
    const res = await request(server())
      .post('/invoices')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send(body);
    if (res.status === 201) invoiceIds.set(number, res.body.id);
    return res;
  }

  function registerBackground(given: StepFn, and: StepFn) {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    const agentStep = (step: StepFn) =>
      step(/^an agent exists with name "(.*)"$/, async (name: string) => {
        const res = await request(server())
          .post('/agents')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type: 'organization' });
        agentIds.set(name, res.body.id);
      });
    agentStep(and);
    agentStep(and);
    and(/^a value exists with name "(.*)"$/, async (name: string) => {
      const res = await request(server())
        .post('/values')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name, type: 'currency', purpose: `Test currency ${name}` });
      valueIds.set(name, res.body.id);
    });
  }

  function registerCreateWithMarket(when: StepFn) {
    when(
      /^I create an invoice with number "(.*)" and market "(.*)"$/,
      async (number: string, market: string) => {
        response = await createInvoice(number, market);
      },
    );
  }

  function registerInvoiceExists(step: StepFn) {
    step(
      /^an invoice exists with number "(.*)" and market "(.*)"$/,
      async (number: string, market: string) => {
        const res = await createInvoice(number, market);
        expect(res.status).toBe(201);
      },
    );
  }

  function registerStatus(then: StepFn) {
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  }

  function registerMarketAssertion(step: StepFn) {
    step(/^the response invoice market should be "(.*)"$/, (market: string) => {
      expect(response.body.market).toBe(market);
    });
  }

  test('Create an internal market invoice', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerCreateWithMarket(when);
    registerStatus(then);
    registerMarketAssertion(and);
  });

  test('Create an external market invoice', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerCreateWithMarket(when);
    registerStatus(then);
    registerMarketAssertion(and);
  });

  test('Market defaults to external when omitted', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(/^I create an invoice with number "(.*)" and no market$/, async (number: string) => {
      response = await createInvoice(number);
    });
    registerStatus(then);
    registerMarketAssertion(and);
  });

  test('Reject an invalid market value', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerCreateWithMarket(when);
    registerStatus(then);
  });

  test("Update an invoice's market", ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerInvoiceExists(given);
    when(/^I update the invoice's market to "(.*)"$/, async (market: string) => {
      const id = invoiceIds.values().next().value;
      response = await request(server())
        .patch(`/invoices/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ market });
    });
    registerStatus(then);
    registerMarketAssertion(and);
  });

  test('Filter invoices by market', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerInvoiceExists(given);
    registerInvoiceExists(and);
    registerInvoiceExists(and);
    when(/^I search invoices with market "(.*)"$/, async (market: string) => {
      response = await request(server())
        .get(`/invoices/search?market=${market}`)
        .set('Cookie', [authCookie]);
    });
    registerStatus(then);
    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });
  });
});
