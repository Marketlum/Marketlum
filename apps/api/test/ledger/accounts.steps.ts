import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { bootstrapApp, cleanDatabase, teardownApp, getApp, createAuthenticatedUser } from '../setup';

const createFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/accounts/create-account.feature'),
);
const listFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/accounts/list-accounts.feature'),
);
const getFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/accounts/get-account.feature'),
);
const updateFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/accounts/update-account.feature'),
);
const deleteFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/accounts/delete-account.feature'),
);
const balanceFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/accounts/account-balance.feature'),
);

// --- helpers ---
function makeHelpers() {
  const valueIds: Record<string, string> = {};
  const agentIds: Record<string, string> = {};
  const accountIds: Record<string, string> = {};
  const transactionIds: Record<string, string> = {};

  function clear() {
    for (const key of Object.keys(valueIds)) delete valueIds[key];
    for (const key of Object.keys(agentIds)) delete agentIds[key];
    for (const key of Object.keys(accountIds)) delete accountIds[key];
    for (const key of Object.keys(transactionIds)) delete transactionIds[key];
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
    const key = `${fromName}->${toName}:${amount}`;
    transactionIds[key] = res.body.id;
    return res.body.id;
  }

  return { valueIds, agentIds, accountIds, transactionIds, clear, createValue, createAgent, createAccount, createTransaction };
}

// --- CREATE ACCOUNT ---
defineFeature(createFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  const h = makeHelpers();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); h.clear(); });
  afterAll(async () => { await teardownApp(); });

  test('Successfully create a new account', ({ given, and, when, then }) => {
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

    when(
      'I create an account with:',
      async (table: { name: string; description: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/accounts')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            description: row.description,
            valueId: h.valueIds['Solar Panel'],
            agentId: h.agentIds['Supplier Co'],
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an account with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain an account with value "(.*)"$/, (valueName: string) => {
      expect(response.body.value).toBeTruthy();
      expect(response.body.value.name).toBe(valueName);
    });

    and(/^the response should contain an account with agent "(.*)"$/, (agentName: string) => {
      expect(response.body.agent).toBeTruthy();
      expect(response.body.agent.name).toBe(agentName);
    });

    and(/^the response should contain an account with balance "(.*)"$/, (balance: string) => {
      expect(response.body.balance).toBe(balance);
    });
  });

  test('Creating an account without valueId fails', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createAgent(authCookie, name, type);
      },
    );

    when(
      'I create an account without valueId with:',
      async (table: { name: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/accounts')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, agentId: h.agentIds['Supplier Co'] });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Creating an account with empty name fails', ({ given, and, when, then }) => {
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

    when('I create an account with empty name', async () => {
      response = await request(getApp().getHttpServer())
        .post('/accounts')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: '', valueId: h.valueIds['Solar Panel'], agentId: h.agentIds['Supplier Co'] });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      'I create an account unauthenticated with:',
      async (table: { name: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/accounts')
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            valueId: '00000000-0000-0000-0000-000000000000',
            agentId: '00000000-0000-0000-0000-000000000000',
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- LIST ACCOUNTS ---
defineFeature(listFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  const h = makeHelpers();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); h.clear(); });
  afterAll(async () => { await teardownApp(); });

  test('List accounts with default pagination', ({ given, and, when, then }) => {
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
      'the following accounts exist:',
      async (table: { name: string }[]) => {
        for (const row of table) {
          await h.createAccount(authCookie, row.name);
        }
      },
    );

    when('I request the list of accounts', async () => {
      response = await request(getApp().getHttpServer())
        .get('/accounts')
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

  test('Filter accounts by valueId', ({ given, and, when, then }) => {
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
      /^an account exists with name "(.*)" for value "(.*)"$/,
      async (name: string, valueName: string) => {
        await h.createAccount(authCookie, name, { valueName });
      },
    );

    and(
      /^an account exists with name "(.*)" for value "(.*)"$/,
      async (name: string, valueName: string) => {
        await h.createAccount(authCookie, name, { valueName });
      },
    );

    when(/^I request the list of accounts with valueId for "(.*)"$/, async (valueName: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/accounts?valueId=${h.valueIds[valueName]}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) accounts?$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(/^all returned accounts should have value "(.*)"$/, (valueName: string) => {
      for (const acc of response.body.data) {
        expect(acc.value.name).toBe(valueName);
      }
    });
  });

  test('Filter accounts by agentId', ({ given, and, when, then }) => {
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

    when(/^I request the list of accounts with agentId for "(.*)"$/, async (agentName: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/accounts?agentId=${h.agentIds[agentName]}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) accounts?$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(/^all returned accounts should have agent "(.*)"$/, (agentName: string) => {
      for (const acc of response.body.data) {
        expect(acc.agent.name).toBe(agentName);
      }
    });
  });

  test('Search accounts by name', ({ given, and, when, then }) => {
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
      /^an account exists with name "(.*)" for value "(.*)"$/,
      async (name: string, valueName: string) => {
        await h.createAccount(authCookie, name, { valueName });
      },
    );

    and(
      /^an account exists with name "(.*)" for value "(.*)"$/,
      async (name: string, valueName: string) => {
        await h.createAccount(authCookie, name, { valueName });
      },
    );

    when(/^I request the list of accounts with search "(.*)"$/, async (search: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/accounts?search=${search}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^all returned accounts should have "(.*)" in their name$/, (searchTerm: string) => {
      const term = searchTerm.toLowerCase();
      for (const acc of response.body.data) {
        expect(acc.name.toLowerCase()).toContain(term);
      }
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I request the list of accounts', async () => {
      response = await request(getApp().getHttpServer()).get('/accounts');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- GET ACCOUNT ---
defineFeature(getFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdId: string;
  const h = makeHelpers();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); h.clear(); });
  afterAll(async () => { await teardownApp(); });

  test('Get an existing account by ID', ({ given, and, when, then }) => {
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
      /^an account exists with name "(.*)" for value "(.*)"$/,
      async (name: string) => {
        createdId = await h.createAccount(authCookie, name);
      },
    );

    when('I request the account by its ID', async () => {
      response = await request(getApp().getHttpServer())
        .get(`/accounts/${createdId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an account with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain an account with balance "(.*)"$/, (balance: string) => {
      expect(response.body.balance).toBe(balance);
    });
  });

  test('Get a non-existent account returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I request an account with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/accounts/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I request an account with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer()).get(`/accounts/${id}`);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- UPDATE ACCOUNT ---
defineFeature(updateFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdId: string;
  const h = makeHelpers();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); h.clear(); });
  afterAll(async () => { await teardownApp(); });

  test("Successfully update an account's name", ({ given, and, when, then }) => {
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
      /^an account exists with name "(.*)" for value "(.*)"$/,
      async (name: string) => {
        createdId = await h.createAccount(authCookie, name);
      },
    );

    when(/^I update the account's name to "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/accounts/${createdId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an account with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Update a non-existent account returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I update the account with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/accounts/${id}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      /^I update the account with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/accounts/${id}`)
          .set('X-CSRF-Protection', '1')
          .send({ name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DELETE ACCOUNT ---
defineFeature(deleteFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdId: string;
  const h = makeHelpers();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); h.clear(); });
  afterAll(async () => { await teardownApp(); });

  test('Successfully delete an account', ({ given, and, when, then }) => {
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
      /^an account exists with name "(.*)" for value "(.*)"$/,
      async (name: string) => {
        createdId = await h.createAccount(authCookie, name);
      },
    );

    when('I delete the account', async () => {
      response = await request(getApp().getHttpServer())
        .delete(`/accounts/${createdId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Delete a non-existent account returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I delete the account with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/accounts/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I delete the account with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/accounts/${id}`)
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- ACCOUNT BALANCE ---
defineFeature(balanceFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  const h = makeHelpers();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); h.clear(); });
  afterAll(async () => { await teardownApp(); });

  test('New account has balance of zero', ({ given, and, when, then }) => {
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
      /^an account exists with name "(.*)" for value "(.*)"$/,
      async (name: string) => {
        await h.createAccount(authCookie, name);
      },
    );

    when('I request the account by its ID', async () => {
      response = await request(getApp().getHttpServer())
        .get(`/accounts/${h.accountIds['Energy Account']}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an account with balance "(.*)"$/, (balance: string) => {
      expect(response.body.balance).toBe(balance);
    });
  });

  test('Account balance increases when it is the toAccount', ({ given, and, when, then }) => {
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

    when(/^I request the account "(.*)" by its ID$/, async (accountName: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/accounts/${h.accountIds[accountName]}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an account with balance "(.*)"$/, (balance: string) => {
      expect(response.body.balance).toBe(balance);
    });
  });

  test('Account balance decreases when it is the fromAccount', ({ given, and, when, then }) => {
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

    when(/^I request the account "(.*)" by its ID$/, async (accountName: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/accounts/${h.accountIds[accountName]}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an account with balance "(.*)"$/, (balance: string) => {
      expect(response.body.balance).toBe(balance);
    });
  });

  test('Multiple transactions calculate net balance', ({ given, and, when, then }) => {
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

    when(/^I request the account "(.*)" by its ID$/, async (accountName: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/accounts/${h.accountIds[accountName]}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an account with balance "(.*)"$/, (balance: string) => {
      expect(response.body.balance).toBe(balance);
    });
  });
});
