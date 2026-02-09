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
const taxonomyFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agents/assign-agent-taxonomies.feature'),
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

// --- ASSIGN AGENT TAXONOMIES ---
defineFeature(taxonomyFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdAgentId: string;
  const taxonomyIds: Record<string, string> = {};

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    for (const key of Object.keys(taxonomyIds)) {
      delete taxonomyIds[key];
    }
  });

  afterAll(async () => {
    await teardownApp();
  });

  async function createTaxonomy(name: string): Promise<string> {
    const res = await request(getApp().getHttpServer())
      .post('/taxonomies')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ name });
    taxonomyIds[name] = res.body.id;
    return res.body.id;
  }

  test('Create agent with main taxonomy', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    when(
      /^I create an agent with main taxonomy "(.*)" and:$/,
      async (taxonomyName: string, table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/agents')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            type: row.type,
            purpose: row.purpose,
            mainTaxonomyId: taxonomyIds[taxonomyName],
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include main taxonomy "(.*)"$/, (name: string) => {
      expect(response.body.mainTaxonomy).toBeTruthy();
      expect(response.body.mainTaxonomy.name).toBe(name);
    });
  });

  test('Create agent with general taxonomies', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    when(
      /^I create an agent with general taxonomies "(.*)" and:$/,
      async (taxonomyNames: string, table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        const ids = taxonomyNames.split(',').map((n) => taxonomyIds[n.trim()]);
        response = await request(getApp().getHttpServer())
          .post('/agents')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            type: row.type,
            purpose: row.purpose,
            taxonomyIds: ids,
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include general taxonomies "(.*)"$/, (names: string) => {
      const expected = names.split(',').map((n) => n.trim());
      const actual = response.body.taxonomies.map((t: { name: string }) => t.name).sort();
      expect(actual).toEqual(expected.sort());
    });
  });

  test('Create agent with both main and general taxonomies', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    when(
      /^I create an agent with main taxonomy "(.*)" and general taxonomies "(.*)" and:$/,
      async (mainName: string, generalNames: string, table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        const ids = generalNames.split(',').map((n) => taxonomyIds[n.trim()]);
        response = await request(getApp().getHttpServer())
          .post('/agents')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            type: row.type,
            purpose: row.purpose,
            mainTaxonomyId: taxonomyIds[mainName],
            taxonomyIds: ids,
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include main taxonomy "(.*)"$/, (name: string) => {
      expect(response.body.mainTaxonomy).toBeTruthy();
      expect(response.body.mainTaxonomy.name).toBe(name);
    });

    and(/^the response should include general taxonomies "(.*)"$/, (names: string) => {
      const expected = names.split(',').map((n) => n.trim());
      const actual = response.body.taxonomies.map((t: { name: string }) => t.name).sort();
      expect(actual).toEqual(expected.sort());
    });
  });

  test('Create agent with non-existent main taxonomy', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I create an agent with a non-existent main taxonomy and:$/,
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/agents')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            type: row.type,
            purpose: row.purpose,
            mainTaxonomyId: '00000000-0000-0000-0000-000000000000',
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Create agent with non-existent general taxonomy', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    when(
      /^I create an agent with a non-existent general taxonomy and existing "(.*)" and:$/,
      async (existingName: string, table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/agents')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            type: row.type,
            purpose: row.purpose,
            taxonomyIds: [
              taxonomyIds[existingName],
              '00000000-0000-0000-0000-000000000000',
            ],
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test("Update agent's main taxonomy", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
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

    when(/^I update the agent's main taxonomy to "(.*)"$/, async (taxonomyName: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/agents/${createdAgentId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ mainTaxonomyId: taxonomyIds[taxonomyName] });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include main taxonomy "(.*)"$/, (name: string) => {
      expect(response.body.mainTaxonomy).toBeTruthy();
      expect(response.body.mainTaxonomy.name).toBe(name);
    });
  });

  test("Remove agent's main taxonomy", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    and(
      /^an agent exists with name "(.*)" and type "(.*)" and main taxonomy "(.*)"$/,
      async (name: string, type: string, taxonomyName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/agents')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, mainTaxonomyId: taxonomyIds[taxonomyName] });
        createdAgentId = res.body.id;
      },
    );

    when("I update the agent's main taxonomy to null", async () => {
      response = await request(getApp().getHttpServer())
        .patch(`/agents/${createdAgentId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ mainTaxonomyId: null });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should have null main taxonomy', () => {
      expect(response.body.mainTaxonomy).toBeNull();
    });
  });

  test("Update agent's general taxonomies", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    and(
      /^an agent exists with name "(.*)" and type "(.*)" and general taxonomies "(.*)"$/,
      async (name: string, type: string, taxonomyNames: string) => {
        const ids = taxonomyNames.split(',').map((n) => taxonomyIds[n.trim()]);
        const res = await request(getApp().getHttpServer())
          .post('/agents')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, taxonomyIds: ids });
        createdAgentId = res.body.id;
      },
    );

    when(/^I update the agent's general taxonomies to "(.*)"$/, async (taxonomyNames: string) => {
      const ids = taxonomyNames.split(',').map((n) => taxonomyIds[n.trim()]);
      response = await request(getApp().getHttpServer())
        .patch(`/agents/${createdAgentId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ taxonomyIds: ids });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include general taxonomies "(.*)"$/, (names: string) => {
      const expected = names.split(',').map((n) => n.trim());
      const actual = response.body.taxonomies.map((t: { name: string }) => t.name).sort();
      expect(actual).toEqual(expected.sort());
    });
  });

  test("Clear agent's general taxonomies", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    and(
      /^an agent exists with name "(.*)" and type "(.*)" and general taxonomies "(.*)"$/,
      async (name: string, type: string, taxonomyNames: string) => {
        const ids = taxonomyNames.split(',').map((n) => taxonomyIds[n.trim()]);
        const res = await request(getApp().getHttpServer())
          .post('/agents')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, taxonomyIds: ids });
        createdAgentId = res.body.id;
      },
    );

    when("I update the agent's general taxonomies to empty", async () => {
      response = await request(getApp().getHttpServer())
        .patch(`/agents/${createdAgentId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ taxonomyIds: [] });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should have empty general taxonomies', () => {
      expect(response.body.taxonomies).toEqual([]);
    });
  });

  test('Get agent by ID includes taxonomy data', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    and(
      /^an agent exists with name "(.*)" and type "(.*)" and main taxonomy "(.*)" and general taxonomies "(.*)"$/,
      async (name: string, type: string, mainName: string, generalNames: string) => {
        const ids = generalNames.split(',').map((n) => taxonomyIds[n.trim()]);
        const res = await request(getApp().getHttpServer())
          .post('/agents')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, mainTaxonomyId: taxonomyIds[mainName], taxonomyIds: ids });
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

    and(/^the response should include main taxonomy "(.*)"$/, (name: string) => {
      expect(response.body.mainTaxonomy).toBeTruthy();
      expect(response.body.mainTaxonomy.name).toBe(name);
    });

    and(/^the response should include general taxonomies "(.*)"$/, (names: string) => {
      const expected = names.split(',').map((n) => n.trim());
      const actual = response.body.taxonomies.map((t: { name: string }) => t.name).sort();
      expect(actual).toEqual(expected.sort());
    });
  });

  test('List agents includes taxonomy data', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    and(
      /^an agent exists with name "(.*)" and type "(.*)" and main taxonomy "(.*)"$/,
      async (name: string, type: string, taxonomyName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/agents')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, mainTaxonomyId: taxonomyIds[taxonomyName] });
        createdAgentId = res.body.id;
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

    and(/^the first agent in the list should include main taxonomy "(.*)"$/, (name: string) => {
      expect(response.body.data.length).toBeGreaterThan(0);
      const agent = response.body.data[0];
      expect(agent.mainTaxonomy).toBeTruthy();
      expect(agent.mainTaxonomy.name).toBe(name);
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
