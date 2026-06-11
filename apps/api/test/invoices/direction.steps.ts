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
  path.resolve(__dirname, '../../../../packages/bdd/features/invoices/direction.feature'),
);

const agentIds = new Map<string, string>();
const valueIds = new Map<string, string>();
const invoiceIds = new Map<string, string>();

async function createAgent(authCookie: string, name: string): Promise<string> {
  const res = await request(getApp().getHttpServer())
    .post('/agents')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'organization' });
  agentIds.set(name, res.body.id);
  return res.body.id;
}

async function createValue(authCookie: string, name: string): Promise<string> {
  const res = await request(getApp().getHttpServer())
    .post('/values')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'currency', purpose: `Currency ${name}` });
  valueIds.set(name, res.body.id);
  return res.body.id;
}

function invoiceBody(number: string, direction?: string): Record<string, unknown> {
  const body: Record<string, unknown> = {
    number,
    fromAgentId: agentIds.get('Seller Corp')!,
    toAgentId: agentIds.get('Buyer Inc')!,
    currencyId: valueIds.get('USD')!,
    issuedAt: '2025-01-15T00:00:00.000Z',
    dueAt: '2025-02-15T00:00:00.000Z',
  };
  if (direction) body.direction = direction;
  return body;
}

async function createInvoice(
  authCookie: string,
  number: string,
  direction?: string,
): Promise<request.Response> {
  return request(getApp().getHttpServer())
    .post('/invoices')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send(invoiceBody(number, direction));
}

function clearMaps() {
  agentIds.clear();
  valueIds.clear();
  invoiceIds.clear();
}

defineFeature(feature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    clearMaps();
  });
  afterAll(async () => {
    await teardownApp();
  });

  function registerBackground(given: any, and: any) {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });
    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });
    and(/^a value exists with name "(.*)"$/, async (name: string) => {
      await createValue(authCookie, name);
    });
  }

  test('Create a revenue invoice', ({ given, when, then, and }) => {
    registerBackground(given, and);
    when(/^I create an invoice with number "(.*)" and direction "(.*)"$/, async (number: string, direction: string) => {
      response = await createInvoice(authCookie, number, direction);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(/^the response invoice direction should be "(.*)"$/, (direction: string) => {
      expect(response.body.direction).toBe(direction);
    });
  });

  test('Create an expense invoice', ({ given, when, then, and }) => {
    registerBackground(given, and);
    when(/^I create an invoice with number "(.*)" and direction "(.*)"$/, async (number: string, direction: string) => {
      response = await createInvoice(authCookie, number, direction);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(/^the response invoice direction should be "(.*)"$/, (direction: string) => {
      expect(response.body.direction).toBe(direction);
    });
  });

  test('Reject creating an invoice without a direction', ({ given, when, then, and }) => {
    registerBackground(given, and);
    when(/^I create an invoice with number "(.*)" and no direction$/, async (number: string) => {
      response = await createInvoice(authCookie, number);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test("Update an invoice's direction", ({ given, when, then, and }) => {
    registerBackground(given, and);
    and(/^an invoice exists with number "(.*)" and direction "(.*)"$/, async (number: string, direction: string) => {
      const res = await createInvoice(authCookie, number, direction);
      invoiceIds.set(number, res.body.id);
    });
    when(/^I update the invoice's direction to "(.*)"$/, async (direction: string) => {
      const id = invoiceIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/invoices/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ direction });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(/^the response invoice direction should be "(.*)"$/, (direction: string) => {
      expect(response.body.direction).toBe(direction);
    });
  });

  test('Filter invoices by direction', ({ given, when, then, and }) => {
    registerBackground(given, and);
    and(/^an invoice exists with number "(.*)" and direction "(.*)"$/, async (number: string, direction: string) => {
      await createInvoice(authCookie, number, direction);
    });
    and(/^an invoice exists with number "(.*)" and direction "(.*)"$/, async (number: string, direction: string) => {
      await createInvoice(authCookie, number, direction);
    });
    and(/^an invoice exists with number "(.*)" and direction "(.*)"$/, async (number: string, direction: string) => {
      await createInvoice(authCookie, number, direction);
    });
    when(/^I search invoices with direction "(.*)"$/, async (direction: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/invoices/search?direction=${direction}`)
        .set('Cookie', [authCookie]);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });
  });
});
