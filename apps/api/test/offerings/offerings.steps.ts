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
  path.resolve(__dirname, '../../../../packages/bdd/features/offerings/create-offering.feature'),
);
const getFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/offerings/get-offering.feature'),
);
const updateFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/offerings/update-offering.feature'),
);
const deleteFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/offerings/delete-offering.feature'),
);
const searchFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/offerings/search-offerings.feature'),
);

const offeringIds = new Map<string, string>();
const agentIds = new Map<string, string>();
const valueStreamIds = new Map<string, string>();
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

async function createValueStream(authCookie: string, name: string): Promise<string> {
  const res = await request(getApp().getHttpServer())
    .post('/value-streams')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name });
  valueStreamIds.set(name, res.body.id);
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

async function createOffering(
  authCookie: string,
  name: string,
  opts: {
    state?: string;
    agentId?: string;
    valueStreamId?: string;
    components?: { valueId: string; quantity: string }[];
  } = {},
): Promise<request.Response> {
  const body: Record<string, unknown> = { name };
  if (opts.state) body.state = opts.state;
  if (opts.agentId) body.agentId = opts.agentId;
  if (opts.valueStreamId) body.valueStreamId = opts.valueStreamId;
  if (opts.components) body.components = opts.components;
  return request(getApp().getHttpServer())
    .post('/offerings')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
}

// --- CREATE OFFERING ---
defineFeature(createFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    offeringIds.clear();
    agentIds.clear();
    valueStreamIds.clear();
    valueIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Create offering with all fields', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a value stream exists with name "(.*)"$/, async (name: string) => {
      await createValueStream(authCookie, name);
    });

    when(
      'I create an offering with:',
      async (table: { name: string; purpose: string; description: string; link: string; state: string; activeFrom: string; activeUntil: string }[]) => {
        const row = table[0];
        const agentId = agentIds.values().next().value;
        const valueStreamId = valueStreamIds.values().next().value;
        response = await request(getApp().getHttpServer())
          .post('/offerings')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            purpose: row.purpose,
            description: row.description,
            link: row.link,
            state: row.state,
            activeFrom: row.activeFrom,
            activeUntil: row.activeUntil,
            valueStreamId,
            agentId,
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an offering with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain an offering with state "(.*)"$/, (state: string) => {
      expect(response.body.state).toBe(state);
    });

    and(/^the response should contain a valueStream with name "(.*)"$/, (name: string) => {
      expect(response.body.valueStream).toBeDefined();
      expect(response.body.valueStream.name).toBe(name);
    });

    and(/^the response should contain an agent with name "(.*)"$/, (name: string) => {
      expect(response.body.agent).toBeDefined();
      expect(response.body.agent.name).toBe(name);
    });
  });

  test('Create offering with minimal fields', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I create an offering with name "(.*)"$/, async (name: string) => {
      response = await createOffering(authCookie, name);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an offering with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain an offering with state "(.*)"$/, (state: string) => {
      expect(response.body.state).toBe(state);
    });
  });

  test('Create offering with components', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a value exists with name "(.*)"$/, async (name: string) => {
      await createValue(authCookie, name);
    });

    and(/^a value exists with name "(.*)"$/, async (name: string) => {
      await createValue(authCookie, name);
    });

    when(
      'I create an offering with components:',
      async (table: { name: string }[]) => {
        const row = table[0];
        const vals = Array.from(valueIds.entries());
        response = await createOffering(authCookie, row.name, {
          components: vals.map(([, id]) => ({
            valueId: id,
            quantity: '10.00',
          })),
        });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an offering with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain (\d+) components$/, (count: string) => {
      expect(response.body.components).toHaveLength(parseInt(count));
    });

    and('the components should reference the created values', () => {
      const compValueIds = response.body.components.map((c: { value: { id: string } }) => c.value.id);
      const expectedIds = Array.from(valueIds.values());
      for (const id of expectedIds) {
        expect(compValueIds).toContain(id);
      }
    });
  });

  test('Create offering with empty name fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create an offering with empty name', async () => {
      response = await request(getApp().getHttpServer())
        .post('/offerings')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: '' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Create offering with non-existent valueStreamId fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create an offering with non-existent valueStreamId', async () => {
      response = await request(getApp().getHttpServer())
        .post('/offerings')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          name: 'Test',
          valueStreamId: '00000000-0000-0000-0000-000000000000',
        });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Create offering with non-existent agentId fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create an offering with non-existent agentId', async () => {
      response = await request(getApp().getHttpServer())
        .post('/offerings')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          name: 'Test',
          agentId: '00000000-0000-0000-0000-000000000000',
        });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I create an offering without authentication', async () => {
      response = await request(getApp().getHttpServer())
        .post('/offerings')
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Test' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- GET OFFERING ---
defineFeature(getFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    offeringIds.clear();
    agentIds.clear();
    valueStreamIds.clear();
    valueIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Get an existing offering by ID', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an offering exists with name "(.*)"$/, async (name: string) => {
      const res = await createOffering(authCookie, name);
      offeringIds.set(name, res.body.id);
    });

    when('I request the offering by its ID', async () => {
      const id = offeringIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .get(`/offerings/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an offering with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Get offering with components loaded', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a value exists with name "(.*)"$/, async (name: string) => {
      await createValue(authCookie, name);
    });

    and(/^a value exists with name "(.*)"$/, async (name: string) => {
      await createValue(authCookie, name);
    });

    and(/^an offering exists with name "(.*)" and components$/, async (name: string) => {
      const vals = Array.from(valueIds.values());
      const res = await createOffering(authCookie, name, {
        components: vals.map((id) => ({ valueId: id, quantity: '5.00' })),
      });
      offeringIds.set(name, res.body.id);
    });

    when('I request the offering by its ID', async () => {
      const id = offeringIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .get(`/offerings/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an offering with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain (\d+) components$/, (count: string) => {
      expect(response.body.components).toHaveLength(parseInt(count));
    });
  });

  test('Get a non-existent offering returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I request an offering with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/offerings/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I request an offering with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer()).get(`/offerings/${id}`);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- UPDATE OFFERING ---
defineFeature(updateFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    offeringIds.clear();
    agentIds.clear();
    valueStreamIds.clear();
    valueIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Update offering name', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an offering exists with name "(.*)"$/, async (name: string) => {
      const res = await createOffering(authCookie, name);
      offeringIds.set(name, res.body.id);
    });

    when(/^I update the offering's name to "(.*)"$/, async (name: string) => {
      const id = offeringIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/offerings/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an offering with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Update offering state from draft to live', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an offering exists with name "(.*)"$/, async (name: string) => {
      const res = await createOffering(authCookie, name);
      offeringIds.set(name, res.body.id);
    });

    when(/^I update the offering's state to "(.*)"$/, async (state: string) => {
      const id = offeringIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/offerings/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ state });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an offering with state "(.*)"$/, (state: string) => {
      expect(response.body.state).toBe(state);
    });
  });

  test('Replace offering components', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
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
      /^an offering exists with name "(.*)" and components for "(.*)" and "(.*)"$/,
      async (name: string, val1: string, val2: string) => {
        const v1 = valueIds.get(val1)!;
        const v2 = valueIds.get(val2)!;
        const res = await createOffering(authCookie, name, {
          components: [
            { valueId: v1, quantity: '1.00' },
            { valueId: v2, quantity: '2.00' },
          ],
        });
        offeringIds.set(name, res.body.id);
      },
    );

    when(
      /^I replace the offering components with "(.*)" and "(.*)"$/,
      async (val1: string, val2: string) => {
        const id = offeringIds.values().next().value;
        const v1 = valueIds.get(val1)!;
        const v2 = valueIds.get(val2)!;
        response = await request(getApp().getHttpServer())
          .patch(`/offerings/${id}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            components: [
              { valueId: v1, quantity: '3.00' },
              { valueId: v2, quantity: '4.00' },
            ],
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) components$/, (count: string) => {
      expect(response.body.components).toHaveLength(parseInt(count));
    });

    and(
      /^the components should include "(.*)" and "(.*)"$/,
      (val1: string, val2: string) => {
        const names = response.body.components.map(
          (c: { value: { name: string } }) => c.value.name,
        );
        expect(names).toContain(val1);
        expect(names).toContain(val2);
      },
    );
  });

  test('Update a non-existent offering returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I update the offering with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/offerings/${id}`)
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
      /^I update the offering with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/offerings/${id}`)
          .set('X-CSRF-Protection', '1')
          .send({ name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DELETE OFFERING ---
defineFeature(deleteFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    offeringIds.clear();
    agentIds.clear();
    valueStreamIds.clear();
    valueIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Delete an existing offering', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an offering exists with name "(.*)"$/, async (name: string) => {
      const res = await createOffering(authCookie, name);
      offeringIds.set(name, res.body.id);
    });

    when('I delete the offering', async () => {
      const id = offeringIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .delete(`/offerings/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Delete offering with components cascades', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a value exists with name "(.*)"$/, async (name: string) => {
      await createValue(authCookie, name);
    });

    and(/^an offering exists with name "(.*)" and a component$/, async (name: string) => {
      const valId = valueIds.values().next().value!;
      const res = await createOffering(authCookie, name, {
        components: [{ valueId: valId, quantity: '1.00' }],
      });
      offeringIds.set(name, res.body.id);
    });

    when('I delete the offering', async () => {
      const id = offeringIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .delete(`/offerings/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Delete a non-existent offering returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I delete the offering with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/offerings/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I delete the offering with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/offerings/${id}`)
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- SEARCH OFFERINGS ---
defineFeature(searchFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    offeringIds.clear();
    agentIds.clear();
    valueStreamIds.clear();
    valueIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Search with default pagination', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an offering exists with name "(.*)"$/, async (name: string) => {
      const res = await createOffering(authCookie, name);
      offeringIds.set(name, res.body.id);
    });

    and(/^an offering exists with name "(.*)"$/, async (name: string) => {
      const res = await createOffering(authCookie, name);
      offeringIds.set(name, res.body.id);
    });

    and(/^an offering exists with name "(.*)"$/, async (name: string) => {
      const res = await createOffering(authCookie, name);
      offeringIds.set(name, res.body.id);
    });

    when('I search offerings', async () => {
      response = await request(getApp().getHttpServer())
        .get('/offerings/search')
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

  test('Search by name text', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an offering exists with name "(.*)"$/, async (name: string) => {
      await createOffering(authCookie, name);
    });

    and(/^an offering exists with name "(.*)"$/, async (name: string) => {
      await createOffering(authCookie, name);
    });

    and(/^an offering exists with name "(.*)"$/, async (name: string) => {
      await createOffering(authCookie, name);
    });

    when(/^I search offerings with search "(.*)"$/, async (search: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/offerings/search?search=${encodeURIComponent(search)}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });
  });

  test('Filter by state', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^an offering exists with name "(.*)" and state "(.*)"$/,
      async (name: string, state: string) => {
        await createOffering(authCookie, name, { state });
      },
    );

    and(
      /^an offering exists with name "(.*)" and state "(.*)"$/,
      async (name: string, state: string) => {
        await createOffering(authCookie, name, { state });
      },
    );

    and(
      /^an offering exists with name "(.*)" and state "(.*)"$/,
      async (name: string, state: string) => {
        await createOffering(authCookie, name, { state });
      },
    );

    when(/^I search offerings with state "(.*)"$/, async (state: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/offerings/search?state=${state}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });
  });

  test('Filter by agentId', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(
      /^an offering exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        const agentId = agentIds.get(agentName)!;
        await createOffering(authCookie, name, { agentId });
      },
    );

    and(
      /^an offering exists with name "(.*)" for agent "(.*)"$/,
      async (name: string, agentName: string) => {
        const agentId = agentIds.get(agentName)!;
        await createOffering(authCookie, name, { agentId });
      },
    );

    and(/^an offering exists with name "(.*)"$/, async (name: string) => {
      await createOffering(authCookie, name);
    });

    when(/^I search offerings with agentId for "(.*)"$/, async (agentName: string) => {
      const agentId = agentIds.get(agentName);
      response = await request(getApp().getHttpServer())
        .get(`/offerings/search?agentId=${agentId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });
  });

  test('Filter by valueStreamId', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a value stream exists with name "(.*)"$/, async (name: string) => {
      await createValueStream(authCookie, name);
    });

    and(/^a value stream exists with name "(.*)"$/, async (name: string) => {
      await createValueStream(authCookie, name);
    });

    and(
      /^an offering exists with name "(.*)" for value stream "(.*)"$/,
      async (name: string, vsName: string) => {
        const valueStreamId = valueStreamIds.get(vsName)!;
        await createOffering(authCookie, name, { valueStreamId });
      },
    );

    and(
      /^an offering exists with name "(.*)" for value stream "(.*)"$/,
      async (name: string, vsName: string) => {
        const valueStreamId = valueStreamIds.get(vsName)!;
        await createOffering(authCookie, name, { valueStreamId });
      },
    );

    when(/^I search offerings with valueStreamId for "(.*)"$/, async (vsName: string) => {
      const valueStreamId = valueStreamIds.get(vsName);
      response = await request(getApp().getHttpServer())
        .get(`/offerings/search?valueStreamId=${valueStreamId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });
  });

  test('Sort by name ascending', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an offering exists with name "(.*)"$/, async (name: string) => {
      await createOffering(authCookie, name);
    });

    and(/^an offering exists with name "(.*)"$/, async (name: string) => {
      await createOffering(authCookie, name);
    });

    and(/^an offering exists with name "(.*)"$/, async (name: string) => {
      await createOffering(authCookie, name);
    });

    when(/^I search offerings sorted by "(.*)" "(.*)"$/, async (sortBy: string, sortOrder: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/offerings/search?sortBy=${sortBy}&sortOrder=${sortOrder}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the first offering should have name "(.*)"$/, (name: string) => {
      expect(response.body.data[0].name).toBe(name);
    });
  });

  test('Default sort by createdAt descending', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an offering exists with name "(.*)"$/, async (name: string) => {
      await createOffering(authCookie, name);
    });

    and(/^an offering exists with name "(.*)"$/, async (name: string) => {
      await createOffering(authCookie, name);
    });

    and(/^an offering exists with name "(.*)"$/, async (name: string) => {
      await createOffering(authCookie, name);
    });

    when('I search offerings', async () => {
      response = await request(getApp().getHttpServer())
        .get('/offerings/search')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the first offering should have name "(.*)"$/, (name: string) => {
      expect(response.body.data[0].name).toBe(name);
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I search offerings', async () => {
      response = await request(getApp().getHttpServer())
        .get('/offerings/search');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
