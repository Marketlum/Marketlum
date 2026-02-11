import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { bootstrapApp, cleanDatabase, teardownApp, getApp, createAuthenticatedUser } from '../setup';

const createFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/transactions/create-transaction.feature'),
);
const listFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/transactions/list-transactions.feature'),
);
const getFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/transactions/get-transaction.feature'),
);
const updateFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/transactions/update-transaction.feature'),
);
const deleteFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/transactions/delete-transaction.feature'),
);
const cascadeFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/transactions/transaction-account-cascade.feature'),
);

// --- helpers ---
function makeHelpers() {
  const valueIds: Record<string, string> = {};
  const agentIds: Record<string, string> = {};
  const accountIds: Record<string, string> = {};
  let lastTransactionId: string = '';

  function clear() {
    for (const key of Object.keys(valueIds)) delete valueIds[key];
    for (const key of Object.keys(agentIds)) delete agentIds[key];
    for (const key of Object.keys(accountIds)) delete accountIds[key];
    lastTransactionId = '';
  }

  async function createValue(authCookie: string, name: string, type: string): Promise<string> {
    const res = await request(getApp().getHttpServer())
      .post('/values')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ name, type });
    valueIds[name] = res.body.id;
    return res.body.id;
  }

  async function createAgent(authCookie: string, name: string, type: string): Promise<string> {
    const res = await request(getApp().getHttpServer())
      .post('/agents')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ name, type });
    agentIds[name] = res.body.id;
    return res.body.id;
  }

  async function createAccount(
    authCookie: string,
    name: string,
    opts?: { valueName?: string; agentName?: string },
  ): Promise<string> {
    const valueName = opts?.valueName || Object.keys(valueIds)[0];
    const agentName = opts?.agentName || Object.keys(agentIds)[0];
    const res = await request(getApp().getHttpServer())
      .post('/accounts')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ name, valueId: valueIds[valueName], agentId: agentIds[agentName] });
    accountIds[name] = res.body.id;
    return res.body.id;
  }

  async function createTransaction(
    authCookie: string,
    fromName: string,
    toName: string,
    amount: string,
    description?: string,
  ): Promise<string> {
    const res = await request(getApp().getHttpServer())
      .post('/transactions')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send({
        fromAccountId: accountIds[fromName],
        toAccountId: accountIds[toName],
        amount,
        description,
      });
    lastTransactionId = res.body.id;
    return res.body.id;
  }

  return { valueIds, agentIds, accountIds, get lastTransactionId() { return lastTransactionId; }, set lastTransactionId(v: string) { lastTransactionId = v; }, clear, createValue, createAgent, createAccount, createTransaction };
}

// --- CREATE TRANSACTION ---
defineFeature(createFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  const h = makeHelpers();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); h.clear(); });
  afterAll(async () => { await teardownApp(); });

  test('Successfully create a new transaction', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    when(
      'I create a transaction with:',
      async (table: { description: string; amount: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/transactions')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            description: row.description,
            amount: row.amount,
            fromAccountId: h.accountIds['Source Account'],
            toAccountId: h.accountIds['Destination Account'],
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a transaction with fromAccount "(.*)"$/, (name: string) => {
      expect(response.body.fromAccount).toBeTruthy();
      expect(response.body.fromAccount.name).toBe(name);
    });

    and(/^the response should contain a transaction with toAccount "(.*)"$/, (name: string) => {
      expect(response.body.toAccount).toBeTruthy();
      expect(response.body.toAccount.name).toBe(name);
    });

    and(/^the response should contain a transaction with amount "(.*)"$/, (amount: string) => {
      expect(response.body.amount).toBe(amount);
    });
  });

  test('Creating a transaction with same from and to account fails', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    when(
      /^I create a transaction from "(.*)" to "(.*)" with amount "(.*)"$/,
      async (fromName: string, toName: string, amount: string) => {
        response = await request(getApp().getHttpServer())
          .post('/transactions')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            fromAccountId: h.accountIds[fromName],
            toAccountId: h.accountIds[toName],
            amount,
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Creating a transaction with non-existent fromAccount fails', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    when('I create a transaction with non-existent fromAccount', async () => {
      response = await request(getApp().getHttpServer())
        .post('/transactions')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          fromAccountId: '00000000-0000-0000-0000-000000000000',
          toAccountId: h.accountIds['Destination Account'],
          amount: '50.00',
        });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Creating a transaction with invalid amount fails', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    when(/^I create a transaction with invalid amount "(.*)"$/, async (amount: string) => {
      response = await request(getApp().getHttpServer())
        .post('/transactions')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          fromAccountId: h.accountIds['Source Account'],
          toAccountId: h.accountIds['Destination Account'],
          amount,
        });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      'I create a transaction unauthenticated with:',
      async (table: { description: string; amount: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/transactions')
          .set('X-CSRF-Protection', '1')
          .send({
            description: row.description,
            amount: row.amount,
            fromAccountId: '00000000-0000-0000-0000-000000000000',
            toAccountId: '00000000-0000-0000-0000-000000000001',
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- LIST TRANSACTIONS ---
defineFeature(listFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  const h = makeHelpers();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); h.clear(); });
  afterAll(async () => { await teardownApp(); });

  test('List transactions with default pagination', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    and(
      'the following transactions exist:',
      async (table: { description: string; amount: string }[]) => {
        for (const row of table) {
          await h.createTransaction(authCookie, 'Source Account', 'Destination Account', row.amount, row.description);
        }
      },
    );

    when('I request the list of transactions', async () => {
      response = await request(getApp().getHttpServer())
        .get('/transactions')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should contain a paginated list', () => {
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
      expect(response.body.meta).toHaveProperty('totalPages');
    });
  });

  test('Filter transactions by fromAccountId', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    and(
      /^a transaction exists from "(.*)" to "(.*)" with amount "(.*)"$/,
      async (fromName: string, toName: string, amount: string) => {
        await h.createTransaction(authCookie, fromName, toName, amount);
      },
    );

    and(
      /^a transaction exists from "(.*)" to "(.*)" with amount "(.*)"$/,
      async (fromName: string, toName: string, amount: string) => {
        await h.createTransaction(authCookie, fromName, toName, amount);
      },
    );

    when(/^I request the list of transactions with fromAccountId for "(.*)"$/, async (accountName: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/transactions?fromAccountId=${h.accountIds[accountName]}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) transactions?$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(/^all returned transactions should have fromAccount "(.*)"$/, (accountName: string) => {
      for (const tx of response.body.data) {
        expect(tx.fromAccount.name).toBe(accountName);
      }
    });
  });

  test('Filter transactions by toAccountId', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    and(
      /^a transaction exists from "(.*)" to "(.*)" with amount "(.*)"$/,
      async (fromName: string, toName: string, amount: string) => {
        await h.createTransaction(authCookie, fromName, toName, amount);
      },
    );

    and(
      /^a transaction exists from "(.*)" to "(.*)" with amount "(.*)"$/,
      async (fromName: string, toName: string, amount: string) => {
        await h.createTransaction(authCookie, fromName, toName, amount);
      },
    );

    when(/^I request the list of transactions with toAccountId for "(.*)"$/, async (accountName: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/transactions?toAccountId=${h.accountIds[accountName]}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) transactions?$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(/^all returned transactions should have toAccount "(.*)"$/, (accountName: string) => {
      for (const tx of response.body.data) {
        expect(tx.toAccount.name).toBe(accountName);
      }
    });
  });

  test('Search transactions by description', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    and(
      /^a transaction exists from "(.*)" to "(.*)" with amount "(.*)" and description "(.*)"$/,
      async (fromName: string, toName: string, amount: string, description: string) => {
        await h.createTransaction(authCookie, fromName, toName, amount, description);
      },
    );

    and(
      /^a transaction exists from "(.*)" to "(.*)" with amount "(.*)" and description "(.*)"$/,
      async (fromName: string, toName: string, amount: string, description: string) => {
        await h.createTransaction(authCookie, fromName, toName, amount, description);
      },
    );

    when(/^I request the list of transactions with search "(.*)"$/, async (search: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/transactions?search=${search}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^all returned transactions should have "(.*)" in their description$/, (searchTerm: string) => {
      const term = searchTerm.toLowerCase();
      for (const tx of response.body.data) {
        expect(tx.description.toLowerCase()).toContain(term);
      }
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I request the list of transactions', async () => {
      response = await request(getApp().getHttpServer()).get('/transactions');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- GET TRANSACTION ---
defineFeature(getFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  const h = makeHelpers();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); h.clear(); });
  afterAll(async () => { await teardownApp(); });

  test('Get an existing transaction by ID', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    and(
      /^a transaction exists from "(.*)" to "(.*)" with amount "(.*)"$/,
      async (fromName: string, toName: string, amount: string) => {
        await h.createTransaction(authCookie, fromName, toName, amount);
      },
    );

    when('I request the transaction by its ID', async () => {
      response = await request(getApp().getHttpServer())
        .get(`/transactions/${h.lastTransactionId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a transaction with amount "(.*)"$/, (amount: string) => {
      expect(response.body.amount).toBe(amount);
    });
  });

  test('Get a non-existent transaction returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I request a transaction with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/transactions/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I request a transaction with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer()).get(`/transactions/${id}`);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- UPDATE TRANSACTION ---
defineFeature(updateFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  const h = makeHelpers();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); h.clear(); });
  afterAll(async () => { await teardownApp(); });

  test("Successfully update a transaction's description", ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    and(
      /^a transaction exists from "(.*)" to "(.*)" with amount "(.*)"$/,
      async (fromName: string, toName: string, amount: string) => {
        await h.createTransaction(authCookie, fromName, toName, amount);
      },
    );

    when(/^I update the transaction's description to "(.*)"$/, async (description: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/transactions/${h.lastTransactionId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ description });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a transaction with description "(.*)"$/, (description: string) => {
      expect(response.body.description).toBe(description);
    });
  });

  test('Updating transaction to same from and to account fails', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    and(
      /^a transaction exists from "(.*)" to "(.*)" with amount "(.*)"$/,
      async (fromName: string, toName: string, amount: string) => {
        await h.createTransaction(authCookie, fromName, toName, amount);
      },
    );

    when(/^I update the transaction's fromAccountId to "(.*)"$/, async (accountName: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/transactions/${h.lastTransactionId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ fromAccountId: h.accountIds[accountName] });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Update a non-existent transaction returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I update the transaction with ID "(.*)" with description "(.*)"$/,
      async (id: string, description: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/transactions/${id}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ description });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      /^I update the transaction with ID "(.*)" with description "(.*)"$/,
      async (id: string, description: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/transactions/${id}`)
          .set('X-CSRF-Protection', '1')
          .send({ description });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DELETE TRANSACTION ---
defineFeature(deleteFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  const h = makeHelpers();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); h.clear(); });
  afterAll(async () => { await teardownApp(); });

  test('Successfully delete a transaction', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    and(
      /^a transaction exists from "(.*)" to "(.*)" with amount "(.*)"$/,
      async (fromName: string, toName: string, amount: string) => {
        await h.createTransaction(authCookie, fromName, toName, amount);
      },
    );

    when('I delete the transaction', async () => {
      response = await request(getApp().getHttpServer())
        .delete(`/transactions/${h.lastTransactionId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Delete a non-existent transaction returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I delete the transaction with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/transactions/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I delete the transaction with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/transactions/${id}`)
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- TRANSACTION ACCOUNT CASCADE ---
defineFeature(cascadeFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  const h = makeHelpers();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); h.clear(); });
  afterAll(async () => { await teardownApp(); });

  test('Deleting an account cascades to its transactions', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    and(
      /^an account exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        await h.createAccount(authCookie, name, { agentName });
      },
    );

    and(
      /^a transaction exists from "(.*)" to "(.*)" with amount "(.*)"$/,
      async (fromName: string, toName: string, amount: string) => {
        await h.createTransaction(authCookie, fromName, toName, amount);
      },
    );

    when(/^I delete the account "(.*)"$/, async (accountName: string) => {
      await request(getApp().getHttpServer())
        .delete(`/accounts/${h.accountIds[accountName]}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    and('I request the transaction by its ID', async () => {
      response = await request(getApp().getHttpServer())
        .get(`/transactions/${h.lastTransactionId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
