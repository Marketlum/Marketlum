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

const createFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/invoices/create-invoice.feature'),
);
const getFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/invoices/get-invoice.feature'),
);
const updateFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/invoices/update-invoice.feature'),
);
const deleteFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/invoices/delete-invoice.feature'),
);
const searchFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/invoices/search-invoices.feature'),
);

const invoiceIds = new Map<string, string>();
const agentIds = new Map<string, string>();
const valueIds = new Map<string, string>();
const valueInstanceIds = new Map<string, string>();
const valueStreamIds = new Map<string, string>();

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
    .send({ name, type: 'product' });
  valueIds.set(name, res.body.id);
  return res.body.id;
}

async function createValueInstance(
  authCookie: string,
  name: string,
  valueId: string,
): Promise<string> {
  const res = await request(getApp().getHttpServer())
    .post('/value-instances')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, valueId });
  valueInstanceIds.set(name, res.body.id);
  return res.body.id;
}

async function createValueStream(authCookie: string, name: string): Promise<string> {
  const res = await request(getApp().getHttpServer())
    .post('/value-streams')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name });
  valueStreamIds.set(name, res.body.id);
  return res.body.id;
}

async function createInvoice(
  authCookie: string,
  number: string,
  fromAgentName: string,
  toAgentName: string,
  opts: {
    paid?: boolean;
    currencyName?: string;
    items?: { valueId?: string; valueInstanceId?: string; quantity: string; unitPrice: string; total: string }[];
    valueStreamId?: string;
  } = {},
): Promise<request.Response> {
  const fromAgentId = agentIds.get(fromAgentName)!;
  const toAgentId = agentIds.get(toAgentName)!;
  const currencyId = valueIds.get(opts.currencyName || 'USD')!;
  const body: Record<string, unknown> = {
    number,
    fromAgentId,
    toAgentId,
    issuedAt: '2025-01-15T00:00:00.000Z',
    dueAt: '2025-02-15T00:00:00.000Z',
    currencyId,
  };
  if (opts.paid !== undefined) body.paid = opts.paid;
  if (opts.items) body.items = opts.items;
  if (opts.valueStreamId) body.valueStreamId = opts.valueStreamId;
  return request(getApp().getHttpServer())
    .post('/invoices')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
}

function clearMaps() {
  invoiceIds.clear();
  agentIds.clear();
  valueIds.clear();
  valueInstanceIds.clear();
  valueStreamIds.clear();
}

// --- CREATE INVOICE ---
defineFeature(createFeature, (test) => {
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

  test('Create invoice with all fields', ({ given, when, then, and }) => {
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

    and(/^a value stream exists with name "(.*)"$/, async (name: string) => {
      await createValueStream(authCookie, name);
    });

    when(
      'I create an invoice with:',
      async (table: { number: string; issuedAt: string; dueAt: string; paid: string; link: string }[]) => {
        const row = table[0];
        const fromAgentId = agentIds.get('Seller Corp')!;
        const toAgentId = agentIds.get('Buyer Inc')!;
        const currencyId = valueIds.get('USD')!;
        const valueStreamId = valueStreamIds.values().next().value;
        response = await request(getApp().getHttpServer())
          .post('/invoices')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            number: row.number,
            fromAgentId,
            toAgentId,
            issuedAt: row.issuedAt,
            dueAt: row.dueAt,
            currencyId,
            paid: row.paid === 'true',
            link: row.link,
            valueStreamId,
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an invoice with number "(.*)"$/, (number: string) => {
      expect(response.body.number).toBe(number);
    });

    and(/^the response should contain a fromAgent with name "(.*)"$/, (name: string) => {
      expect(response.body.fromAgent).toBeDefined();
      expect(response.body.fromAgent.name).toBe(name);
    });

    and(/^the response should contain a toAgent with name "(.*)"$/, (name: string) => {
      expect(response.body.toAgent).toBeDefined();
      expect(response.body.toAgent.name).toBe(name);
    });

    and(/^the response should contain a currency with name "(.*)"$/, (name: string) => {
      expect(response.body.currency).toBeDefined();
      expect(response.body.currency.name).toBe(name);
    });

    and(/^the response should contain a valueStream with name "(.*)"$/, (name: string) => {
      expect(response.body.valueStream).toBeDefined();
      expect(response.body.valueStream.name).toBe(name);
    });

    and(/^the response should contain an invoice with paid (.*)$/, (paid: string) => {
      expect(response.body.paid).toBe(paid === 'true');
    });
  });

  test('Create invoice with items', ({ given, when, then, and }) => {
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

    and(/^a value exists with name "(.*)"$/, async (name: string) => {
      await createValue(authCookie, name);
    });

    and(
      /^a value instance exists with name "(.*)" for value "(.*)"$/,
      async (name: string, valueName: string) => {
        const valueId = valueIds.get(valueName)!;
        await createValueInstance(authCookie, name, valueId);
      },
    );

    when(
      'I create an invoice with items:',
      async (table: { number: string }[]) => {
        const row = table[0];
        const widgetAId = valueIds.get('Widget A')!;
        const instanceId = valueInstanceIds.get('Widget A Instance')!;
        response = await createInvoice(authCookie, row.number, 'Seller Corp', 'Buyer Inc', {
          items: [
            { valueId: widgetAId, quantity: '10.00', unitPrice: '10.00', total: '100.00' },
            { valueInstanceId: instanceId, quantity: '5.00', unitPrice: '50.00', total: '250.00' },
          ],
        });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an invoice with number "(.*)"$/, (number: string) => {
      expect(response.body.number).toBe(number);
    });

    and(/^the response should contain (\d+) items$/, (count: string) => {
      expect(response.body.items).toHaveLength(parseInt(count));
    });

    and(/^the response total should be "(.*)"$/, (total: string) => {
      expect(response.body.total).toBe(total);
    });
  });

  test('Reject duplicate number for same fromAgent', ({ given, when, then, and }) => {
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

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        const res = await createInvoice(authCookie, number, from, to);
        invoiceIds.set(number, res.body.id);
      },
    );

    when(
      /^I create a duplicate invoice with number "(.*)" from "(.*)"$/,
      async (number: string, from: string) => {
        response = await createInvoice(authCookie, number, from, 'Buyer Inc');
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Allow same number for different fromAgents', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
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

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        const res = await createInvoice(authCookie, number, from, to);
        invoiceIds.set(number, res.body.id);
      },
    );

    when(
      /^I create an invoice with number "(.*)" from "(.*)"$/,
      async (number: string, from: string) => {
        response = await createInvoice(authCookie, number, from, 'Buyer Inc');
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Reject missing required fields', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create an invoice with empty body', async () => {
      response = await request(getApp().getHttpServer())
        .post('/invoices')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({});
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Reject non-existent fromAgentId', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create an invoice with non-existent fromAgentId', async () => {
      response = await request(getApp().getHttpServer())
        .post('/invoices')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          number: 'INV-001',
          fromAgentId: '00000000-0000-0000-0000-000000000000',
          toAgentId: '00000000-0000-0000-0000-000000000000',
          issuedAt: '2025-01-01T00:00:00.000Z',
          dueAt: '2025-02-01T00:00:00.000Z',
          currencyId: '00000000-0000-0000-0000-000000000000',
        });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I create an invoice without authentication', async () => {
      response = await request(getApp().getHttpServer())
        .post('/invoices')
        .set('X-CSRF-Protection', '1')
        .send({ number: 'INV-001' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- GET INVOICE ---
defineFeature(getFeature, (test) => {
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

  test('Get an existing invoice by ID', ({ given, when, then, and }) => {
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

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        const res = await createInvoice(authCookie, number, from, to);
        invoiceIds.set(number, res.body.id);
      },
    );

    when('I request the invoice by its ID', async () => {
      const id = invoiceIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .get(`/invoices/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an invoice with number "(.*)"$/, (number: string) => {
      expect(response.body.number).toBe(number);
    });

    and(/^the response should contain a fromAgent with name "(.*)"$/, (name: string) => {
      expect(response.body.fromAgent.name).toBe(name);
    });

    and(/^the response should contain a toAgent with name "(.*)"$/, (name: string) => {
      expect(response.body.toAgent.name).toBe(name);
    });
  });

  test('Get invoice with items and computed total', ({ given, when, then, and }) => {
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

    and(/^a value exists with name "(.*)"$/, async (name: string) => {
      await createValue(authCookie, name);
    });

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)" with items$/,
      async (number: string, from: string, to: string) => {
        const widgetId = valueIds.get('Widget A')!;
        const res = await createInvoice(authCookie, number, from, to, {
          items: [
            { valueId: widgetId, quantity: '10.00', unitPrice: '10.00', total: '100.00' },
            { valueId: widgetId, quantity: '5.00', unitPrice: '50.00', total: '250.00' },
          ],
        });
        invoiceIds.set(number, res.body.id);
      },
    );

    when('I request the invoice by its ID', async () => {
      const id = invoiceIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .get(`/invoices/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) items$/, (count: string) => {
      expect(response.body.items).toHaveLength(parseInt(count));
    });

    and(/^the response total should be "(.*)"$/, (total: string) => {
      expect(response.body.total).toBe(total);
    });
  });

  test('Get a non-existent invoice returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I request an invoice with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/invoices/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I request an invoice with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer()).get(`/invoices/${id}`);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- UPDATE INVOICE ---
defineFeature(updateFeature, (test) => {
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

  test('Update invoice scalar fields', ({ given, when, then, and }) => {
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

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        const res = await createInvoice(authCookie, number, from, to);
        invoiceIds.set(number, res.body.id);
      },
    );

    when(/^I update the invoice's number to "(.*)"$/, async (number: string) => {
      const id = invoiceIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/invoices/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ number });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an invoice with number "(.*)"$/, (number: string) => {
      expect(response.body.number).toBe(number);
    });
  });

  test('Update invoice paid status', ({ given, when, then, and }) => {
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

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        const res = await createInvoice(authCookie, number, from, to);
        invoiceIds.set(number, res.body.id);
      },
    );

    when(/^I update the invoice's paid to (.*)$/, async (paid: string) => {
      const id = invoiceIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/invoices/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ paid: paid === 'true' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an invoice with paid (.*)$/, (paid: string) => {
      expect(response.body.paid).toBe(paid === 'true');
    });
  });

  test('Replace invoice items on update', ({ given, when, then, and }) => {
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

    and(/^a value exists with name "(.*)"$/, async (name: string) => {
      await createValue(authCookie, name);
    });

    and(/^a value exists with name "(.*)"$/, async (name: string) => {
      await createValue(authCookie, name);
    });

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)" with items$/,
      async (number: string, from: string, to: string) => {
        const widgetAId = valueIds.get('Widget A')!;
        const res = await createInvoice(authCookie, number, from, to, {
          items: [
            { valueId: widgetAId, quantity: '2.00', unitPrice: '25.00', total: '50.00' },
          ],
        });
        invoiceIds.set(number, res.body.id);
      },
    );

    when('I replace the invoice items with new values', async () => {
      const id = invoiceIds.values().next().value;
      const widgetBId = valueIds.get('Widget B')!;
      response = await request(getApp().getHttpServer())
        .patch(`/invoices/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          items: [
            { valueId: widgetBId, quantity: '10.00', unitPrice: '50.00', total: '500.00' },
          ],
        });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) items$/, (count: string) => {
      expect(response.body.items).toHaveLength(parseInt(count));
    });

    and(/^the response total should be "(.*)"$/, (total: string) => {
      expect(response.body.total).toBe(total);
    });
  });

  test('Reject duplicate number for same fromAgent on update', ({ given, when, then, and }) => {
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

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        const res = await createInvoice(authCookie, number, from, to);
        invoiceIds.set(number, res.body.id);
      },
    );

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        const res = await createInvoice(authCookie, number, from, to);
        invoiceIds.set(number, res.body.id);
      },
    );

    when(/^I update the second invoice's number to "(.*)"$/, async (number: string) => {
      const id = invoiceIds.get('INV-002')!;
      response = await request(getApp().getHttpServer())
        .patch(`/invoices/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ number });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Update a non-existent invoice returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I update the invoice with ID "(.*)" with number "(.*)"$/,
      async (id: string, number: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/invoices/${id}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ number });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      /^I update the invoice with ID "(.*)" with number "(.*)"$/,
      async (id: string, number: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/invoices/${id}`)
          .set('X-CSRF-Protection', '1')
          .send({ number });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DELETE INVOICE ---
defineFeature(deleteFeature, (test) => {
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

  test('Delete an existing invoice', ({ given, when, then, and }) => {
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

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        const res = await createInvoice(authCookie, number, from, to);
        invoiceIds.set(number, res.body.id);
      },
    );

    when('I delete the invoice', async () => {
      const id = invoiceIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .delete(`/invoices/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Delete invoice cascades items', ({ given, when, then, and }) => {
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

    and(/^a value exists with name "(.*)"$/, async (name: string) => {
      await createValue(authCookie, name);
    });

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)" with items$/,
      async (number: string, from: string, to: string) => {
        const widgetId = valueIds.get('Widget A')!;
        const res = await createInvoice(authCookie, number, from, to, {
          items: [
            { valueId: widgetId, quantity: '1.00', unitPrice: '100.00', total: '100.00' },
          ],
        });
        invoiceIds.set(number, res.body.id);
      },
    );

    when('I delete the invoice', async () => {
      const id = invoiceIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .delete(`/invoices/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Delete a non-existent invoice returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I delete the invoice with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/invoices/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I delete the invoice with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/invoices/${id}`)
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- SEARCH INVOICES ---
defineFeature(searchFeature, (test) => {
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

  test('Search with default pagination', ({ given, when, then, and }) => {
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

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        const res = await createInvoice(authCookie, number, from, to);
        invoiceIds.set(number, res.body.id);
      },
    );

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        const res = await createInvoice(authCookie, number, from, to);
        invoiceIds.set(number, res.body.id);
      },
    );

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        const res = await createInvoice(authCookie, number, from, to);
        invoiceIds.set(number, res.body.id);
      },
    );

    when('I search invoices', async () => {
      response = await request(getApp().getHttpServer())
        .get('/invoices/search')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should contain a paginated list', () => {
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('totalPages');
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });
  });

  test('Search by text', ({ given, when, then, and }) => {
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

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        await createInvoice(authCookie, number, from, to);
      },
    );

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        await createInvoice(authCookie, number, from, to);
      },
    );

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        await createInvoice(authCookie, number, from, to);
      },
    );

    when(/^I search invoices with search "(.*)"$/, async (search: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/invoices/search?search=${encodeURIComponent(search)}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });
  });

  test('Filter by fromAgentId', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
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

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        await createInvoice(authCookie, number, from, to);
      },
    );

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        await createInvoice(authCookie, number, from, to);
      },
    );

    when(/^I search invoices with fromAgentId for "(.*)"$/, async (agentName: string) => {
      const agentId = agentIds.get(agentName);
      response = await request(getApp().getHttpServer())
        .get(`/invoices/search?fromAgentId=${agentId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });
  });

  test('Filter by toAgentId', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
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

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        await createInvoice(authCookie, number, from, to);
      },
    );

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        await createInvoice(authCookie, number, from, to);
      },
    );

    when(/^I search invoices with toAgentId for "(.*)"$/, async (agentName: string) => {
      const agentId = agentIds.get(agentName);
      response = await request(getApp().getHttpServer())
        .get(`/invoices/search?toAgentId=${agentId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });
  });

  test('Filter by paid status', ({ given, when, then, and }) => {
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

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)" with paid (.*)$/,
      async (number: string, from: string, to: string, paid: string) => {
        await createInvoice(authCookie, number, from, to, { paid: paid === 'true' });
      },
    );

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        await createInvoice(authCookie, number, from, to);
      },
    );

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)" with paid (.*)$/,
      async (number: string, from: string, to: string, paid: string) => {
        await createInvoice(authCookie, number, from, to, { paid: paid === 'true' });
      },
    );

    when(/^I search invoices with paid "(.*)"$/, async (paid: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/invoices/search?paid=${paid}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });
  });

  test('Filter by currencyId', ({ given, when, then, and }) => {
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

    and(/^a value exists with name "(.*)"$/, async (name: string) => {
      await createValue(authCookie, name);
    });

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)" with currency "(.*)"$/,
      async (number: string, from: string, to: string, currencyName: string) => {
        await createInvoice(authCookie, number, from, to, { currencyName });
      },
    );

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)" with currency "(.*)"$/,
      async (number: string, from: string, to: string, currencyName: string) => {
        await createInvoice(authCookie, number, from, to, { currencyName });
      },
    );

    when(/^I search invoices with currencyId for "(.*)"$/, async (currencyName: string) => {
      const currencyId = valueIds.get(currencyName);
      response = await request(getApp().getHttpServer())
        .get(`/invoices/search?currencyId=${currencyId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });
  });

  test('Sort by number ascending', ({ given, when, then, and }) => {
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

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        await createInvoice(authCookie, number, from, to);
      },
    );

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        await createInvoice(authCookie, number, from, to);
      },
    );

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        await createInvoice(authCookie, number, from, to);
      },
    );

    when(/^I search invoices sorted by "(.*)" "(.*)"$/, async (sortBy: string, sortOrder: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/invoices/search?sortBy=${sortBy}&sortOrder=${sortOrder}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the first invoice should have number "(.*)"$/, (number: string) => {
      expect(response.body.data[0].number).toBe(number);
    });
  });

  test('Default sort by createdAt descending', ({ given, when, then, and }) => {
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

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        await createInvoice(authCookie, number, from, to);
      },
    );

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        await createInvoice(authCookie, number, from, to);
      },
    );

    and(
      /^an invoice exists with number "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        await createInvoice(authCookie, number, from, to);
      },
    );

    when('I search invoices', async () => {
      response = await request(getApp().getHttpServer())
        .get('/invoices/search')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the first invoice should have number "(.*)"$/, (number: string) => {
      expect(response.body.data[0].number).toBe(number);
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I search invoices', async () => {
      response = await request(getApp().getHttpServer())
        .get('/invoices/search');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
