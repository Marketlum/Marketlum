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
  path.resolve(__dirname, '../../../../packages/bdd/features/dashboard/get-dashboard-summary.feature'),
);

const agentIds = new Map<string, string>();
const valueIds = new Map<string, string>();
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

async function createValueStream(authCookie: string, name: string): Promise<string> {
  const res = await request(getApp().getHttpServer())
    .post('/value-streams')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name });
  valueStreamIds.set(name, res.body.id);
  return res.body.id;
}

async function createInvoiceWithItems(
  authCookie: string,
  fromAgentName: string,
  toAgentName: string,
  issuedAt: string,
  total: string,
  valueStreamName?: string,
): Promise<void> {
  const fromAgentId = agentIds.get(fromAgentName)!;
  const toAgentId = agentIds.get(toAgentName)!;
  const currencyId = valueIds.get('USD')!;
  const number = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const body: Record<string, unknown> = {
    number,
    fromAgentId,
    toAgentId,
    issuedAt: `${issuedAt}T00:00:00.000Z`,
    dueAt: '2025-12-31T00:00:00.000Z',
    currencyId,
    items: [
      { quantity: '1.00', unitPrice: total, total },
    ],
  };
  if (valueStreamName) {
    body.valueStreamId = valueStreamIds.get(valueStreamName)!;
  }
  await request(getApp().getHttpServer())
    .post('/invoices')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
}

function clearMaps() {
  agentIds.clear();
  valueIds.clear();
  valueStreamIds.clear();
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

  test('Authenticated user gets dashboard summary with no filters', ({ given, when, then, and }) => {
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
      /^an invoice exists from "(.*)" to "(.*)" issued at "(.*)" with items totalling "(.*)"$/,
      async (from: string, to: string, issuedAt: string, total: string) => {
        await createInvoiceWithItems(authCookie, from, to, issuedAt, total);
      },
    );

    and(
      /^an invoice exists from "(.*)" to "(.*)" issued at "(.*)" with items totalling "(.*)"$/,
      async (from: string, to: string, issuedAt: string, total: string) => {
        await createInvoiceWithItems(authCookie, from, to, issuedAt, total);
      },
    );

    when('I request the dashboard summary', async () => {
      response = await request(getApp().getHttpServer())
        .get('/dashboard/summary')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain totalRevenue "(.*)"$/, (totalRevenue: string) => {
      expect(response.body.totalRevenue).toBe(totalRevenue);
    });

    and(/^the response should contain totalExpenses "(.*)"$/, (totalExpenses: string) => {
      expect(response.body.totalExpenses).toBe(totalExpenses);
    });

    and(/^the response should contain invoiceCount (\d+)$/, (count: string) => {
      expect(response.body.invoiceCount).toBe(parseInt(count));
    });

    and(/^the timeSeries should have (\d+) entries$/, (count: string) => {
      expect(response.body.timeSeries).toHaveLength(parseInt(count));
    });
  });

  test('Filter by agentId returns revenue and expense split', ({ given, when, then, and }) => {
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
      /^an invoice exists from "(.*)" to "(.*)" issued at "(.*)" with items totalling "(.*)"$/,
      async (from: string, to: string, issuedAt: string, total: string) => {
        await createInvoiceWithItems(authCookie, from, to, issuedAt, total);
      },
    );

    and(
      /^an invoice exists from "(.*)" to "(.*)" issued at "(.*)" with items totalling "(.*)"$/,
      async (from: string, to: string, issuedAt: string, total: string) => {
        await createInvoiceWithItems(authCookie, from, to, issuedAt, total);
      },
    );

    when(/^I request the dashboard summary with agentId for "(.*)"$/, async (agentName: string) => {
      const agentId = agentIds.get(agentName)!;
      response = await request(getApp().getHttpServer())
        .get(`/dashboard/summary?agentId=${agentId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain totalRevenue "(.*)"$/, (totalRevenue: string) => {
      expect(response.body.totalRevenue).toBe(totalRevenue);
    });

    and(/^the response should contain totalExpenses "(.*)"$/, (totalExpenses: string) => {
      expect(response.body.totalExpenses).toBe(totalExpenses);
    });

    and(/^the response should contain invoiceCount (\d+)$/, (count: string) => {
      expect(response.body.invoiceCount).toBe(parseInt(count));
    });
  });

  test('Filter by valueStreamId scopes to invoices in that stream', ({ given, when, then, and }) => {
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

    and(
      /^an invoice exists from "(.*)" to "(.*)" issued at "(.*)" with items totalling "(.*)" in stream "(.*)"$/,
      async (from: string, to: string, issuedAt: string, total: string, stream: string) => {
        await createInvoiceWithItems(authCookie, from, to, issuedAt, total, stream);
      },
    );

    and(
      /^an invoice exists from "(.*)" to "(.*)" issued at "(.*)" with items totalling "(.*)"$/,
      async (from: string, to: string, issuedAt: string, total: string) => {
        await createInvoiceWithItems(authCookie, from, to, issuedAt, total);
      },
    );

    when(/^I request the dashboard summary with valueStreamId for "(.*)"$/, async (streamName: string) => {
      const valueStreamId = valueStreamIds.get(streamName)!;
      response = await request(getApp().getHttpServer())
        .get(`/dashboard/summary?valueStreamId=${valueStreamId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain totalRevenue "(.*)"$/, (totalRevenue: string) => {
      expect(response.body.totalRevenue).toBe(totalRevenue);
    });

    and(/^the response should contain invoiceCount (\d+)$/, (count: string) => {
      expect(response.body.invoiceCount).toBe(parseInt(count));
    });
  });

  test('Filter by date range scopes to issuedAt within range', ({ given, when, then, and }) => {
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
      /^an invoice exists from "(.*)" to "(.*)" issued at "(.*)" with items totalling "(.*)"$/,
      async (from: string, to: string, issuedAt: string, total: string) => {
        await createInvoiceWithItems(authCookie, from, to, issuedAt, total);
      },
    );

    and(
      /^an invoice exists from "(.*)" to "(.*)" issued at "(.*)" with items totalling "(.*)"$/,
      async (from: string, to: string, issuedAt: string, total: string) => {
        await createInvoiceWithItems(authCookie, from, to, issuedAt, total);
      },
    );

    when(
      /^I request the dashboard summary with fromDate "(.*)" and toDate "(.*)"$/,
      async (fromDate: string, toDate: string) => {
        response = await request(getApp().getHttpServer())
          .get(`/dashboard/summary?fromDate=${fromDate}&toDate=${toDate}`)
          .set('Cookie', [authCookie]);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain totalRevenue "(.*)"$/, (totalRevenue: string) => {
      expect(response.body.totalRevenue).toBe(totalRevenue);
    });

    and(/^the response should contain invoiceCount (\d+)$/, (count: string) => {
      expect(response.body.invoiceCount).toBe(parseInt(count));
    });
  });

  test('Combined filters with agent and value stream and dates', ({ given, when, then, and }) => {
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

    and(
      /^an invoice exists from "(.*)" to "(.*)" issued at "(.*)" with items totalling "(.*)" in stream "(.*)"$/,
      async (from: string, to: string, issuedAt: string, total: string, stream: string) => {
        await createInvoiceWithItems(authCookie, from, to, issuedAt, total, stream);
      },
    );

    and(
      /^an invoice exists from "(.*)" to "(.*)" issued at "(.*)" with items totalling "(.*)" in stream "(.*)"$/,
      async (from: string, to: string, issuedAt: string, total: string, stream: string) => {
        await createInvoiceWithItems(authCookie, from, to, issuedAt, total, stream);
      },
    );

    and(
      /^an invoice exists from "(.*)" to "(.*)" issued at "(.*)" with items totalling "(.*)" in stream "(.*)"$/,
      async (from: string, to: string, issuedAt: string, total: string, stream: string) => {
        await createInvoiceWithItems(authCookie, from, to, issuedAt, total, stream);
      },
    );

    and(
      /^an invoice exists from "(.*)" to "(.*)" issued at "(.*)" with items totalling "(.*)"$/,
      async (from: string, to: string, issuedAt: string, total: string) => {
        await createInvoiceWithItems(authCookie, from, to, issuedAt, total);
      },
    );

    when(
      /^I request the dashboard summary with agentId for "(.*)" and valueStreamId for "(.*)" and fromDate "(.*)" and toDate "(.*)"$/,
      async (agentName: string, streamName: string, fromDate: string, toDate: string) => {
        const agentId = agentIds.get(agentName)!;
        const valueStreamId = valueStreamIds.get(streamName)!;
        response = await request(getApp().getHttpServer())
          .get(`/dashboard/summary?agentId=${agentId}&valueStreamId=${valueStreamId}&fromDate=${fromDate}&toDate=${toDate}`)
          .set('Cookie', [authCookie]);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain totalRevenue "(.*)"$/, (totalRevenue: string) => {
      expect(response.body.totalRevenue).toBe(totalRevenue);
    });

    and(/^the response should contain totalExpenses "(.*)"$/, (totalExpenses: string) => {
      expect(response.body.totalExpenses).toBe(totalExpenses);
    });

    and(/^the response should contain invoiceCount (\d+)$/, (count: string) => {
      expect(response.body.invoiceCount).toBe(parseInt(count));
    });
  });

  test('Unauthenticated request returns 401', ({ when, then }) => {
    when('I request the dashboard summary without authentication', async () => {
      response = await request(getApp().getHttpServer())
        .get('/dashboard/summary');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
