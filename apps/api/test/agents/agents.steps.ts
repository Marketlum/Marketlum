import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { bootstrapApp, cleanDatabase, teardownApp, getApp, createAuthenticatedUser } from '../setup';

const createFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agents/create-agent.feature'),
);
const listFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agents/list-agents.feature'),
);
const getFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agents/get-agent.feature'),
);
const updateFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agents/update-agent.feature'),
);
const deleteFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agents/delete-agent.feature'),
);

// --- CREATE AGENT ---
defineFeature(createFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Successfully create a new agent', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create an agent with:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/agents')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, type: row.type, purpose: row.purpose });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an agent with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain an agent with type "(.*)"$/, (type: string) => {
      expect(response.body.type).toBe(type);
    });
  });

  test('Creating an agent with invalid data fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create an agent with:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/agents')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, type: row.type, purpose: row.purpose });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      'I create an agent with:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/agents')
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, type: row.type, purpose: row.purpose });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- LIST AGENTS ---
defineFeature(listFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('List agents with default pagination', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following agents exist:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        for (const row of table) {
          await request(getApp().getHttpServer())
            .post('/agents')
            .set('Cookie', [authCookie])
            .set('X-CSRF-Protection', '1')
            .send({ name: row.name, type: row.type, purpose: row.purpose });
        }
      },
    );

    when('I request the list of agents', async () => {
      response = await request(getApp().getHttpServer())
        .get('/agents')
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

  test('Filter agents by type', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following agents exist:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        for (const row of table) {
          await request(getApp().getHttpServer())
            .post('/agents')
            .set('Cookie', [authCookie])
            .set('X-CSRF-Protection', '1')
            .send({ name: row.name, type: row.type, purpose: row.purpose });
        }
      },
    );

    when(/^I request the list of agents with type "(.*)"$/, async (type: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/agents?type=${type}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^all returned agents should have type "(.*)"$/, (type: string) => {
      for (const agent of response.body.data) {
        expect(agent.type).toBe(type);
      }
    });
  });

  test('Search agents by name', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following agents exist:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        for (const row of table) {
          await request(getApp().getHttpServer())
            .post('/agents')
            .set('Cookie', [authCookie])
            .set('X-CSRF-Protection', '1')
            .send({ name: row.name, type: row.type, purpose: row.purpose });
        }
      },
    );

    when(/^I request the list of agents with search "(.*)"$/, async (search: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/agents?search=${search}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(
      /^all returned agents should have "(.*)" in their name or purpose$/,
      (searchTerm: string) => {
        const term = searchTerm.toLowerCase();
        for (const agent of response.body.data) {
          const nameMatch = agent.name.toLowerCase().includes(term);
          const purposeMatch = agent.purpose?.toLowerCase().includes(term) || false;
          expect(nameMatch || purposeMatch).toBe(true);
        }
      },
    );
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I request the list of agents', async () => {
      response = await request(getApp().getHttpServer()).get('/agents');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- GET AGENT ---
defineFeature(getFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdAgentId: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Get an existing agent by ID', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/agents')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type });
        createdAgentId = res.body.id;
      },
    );

    when('I request the agent by their ID', async () => {
      response = await request(getApp().getHttpServer())
        .get(`/agents/${createdAgentId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an agent with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Get a non-existent agent returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I request an agent with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/agents/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I request an agent with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer()).get(`/agents/${id}`);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- UPDATE AGENT ---
defineFeature(updateFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdAgentId: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test("Successfully update an agent's name", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/agents')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type });
        createdAgentId = res.body.id;
      },
    );

    when(/^I update the agent's name to "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/agents/${createdAgentId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an agent with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Update a non-existent agent returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I update the agent with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/agents/${id}`)
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
      /^I update the agent with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/agents/${id}`)
          .set('X-CSRF-Protection', '1')
          .send({ name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DELETE AGENT ---
defineFeature(deleteFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdAgentId: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Successfully delete an agent', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/agents')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type });
        createdAgentId = res.body.id;
      },
    );

    when('I delete the agent', async () => {
      response = await request(getApp().getHttpServer())
        .delete(`/agents/${createdAgentId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Delete a non-existent agent returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I delete the agent with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/agents/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I delete the agent with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/agents/${id}`)
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
