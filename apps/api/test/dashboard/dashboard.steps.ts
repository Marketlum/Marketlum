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
    .send({ name, type: 'currency' });
  valueIds.set(name, res.body.id);
  // Configure this value as the system presentation currency so invoice items
  // denominated in it snapshot at the identity rate and contribute to dashboard
  // aggregations (which now sum presentationAmount, not total).
  await request(getApp().getHttpServer())
    .put('/system-settings/presentation-currency')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ presentationCurrencyId: res.body.id });
  return res.body.id;
}

async function createInvoiceWithItems(
  authCookie: string,
  fromAgentName: string,
  toAgentName: string,
  issuedAt: string,
  total: string,
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
  await request(getApp().getHttpServer())
    .post('/invoices')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
}

function clearMaps() {
  agentIds.clear();
  valueIds.clear();
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

  test('Combined filters with agent and dates', ({ given, when, then, and }) => {
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

    and(
      /^an invoice exists from "(.*)" to "(.*)" issued at "(.*)" with items totalling "(.*)"$/,
      async (from: string, to: string, issuedAt: string, total: string) => {
        await createInvoiceWithItems(authCookie, from, to, issuedAt, total);
      },
    );

    when(
      /^I request the dashboard summary with agentId for "(.*)" and fromDate "(.*)" and toDate "(.*)"$/,
      async (agentName: string, fromDate: string, toDate: string) => {
        const agentId = agentIds.get(agentName)!;
        response = await request(getApp().getHttpServer())
          .get(`/dashboard/summary?agentId=${agentId}&fromDate=${fromDate}&toDate=${toDate}`)
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
