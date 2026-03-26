import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import {
  bootstrapApp,
  cleanDatabase,
  teardownApp,
  getApp,
  createAuthenticatedUser,
  createUserViaService,
} from '../setup';

const createFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/tensions/create-tension.feature'),
);
const listFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/tensions/list-tensions.feature'),
);
const getFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/tensions/get-tension.feature'),
);
const updateFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/tensions/update-tension.feature'),
);
const deleteFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/tensions/delete-tension.feature'),
);
const searchFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/tensions/search-tensions.feature'),
);

const tensionIds = new Map<string, string>();
const agentIds = new Map<string, string>();
const userIds = new Map<string, string>();
const exchangeIds = new Map<string, string>();

async function createAgent(authCookie: string, name: string): Promise<string> {
  const res = await request(getApp().getHttpServer())
    .post('/agents')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'organization' });
  agentIds.set(name, res.body.id);
  return res.body.id;
}

async function createUser(name: string): Promise<string> {
  const user = await createUserViaService(
    `${name.toLowerCase().replace(/\s/g, '.')}@test.com`,
    'password123',
    name,
  );
  userIds.set(name, user.id);
  return user.id;
}

async function createTension(
  authCookie: string,
  name: string,
  opts: {
    agentName?: string;
    leadName?: string;
    score?: number;
    currentContext?: string;
  } = {},
): Promise<request.Response> {
  const agentId = opts.agentName
    ? agentIds.get(opts.agentName)
    : agentIds.values().next().value;
  const body: Record<string, unknown> = { name, agentId };
  if (opts.leadName) body.leadUserId = userIds.get(opts.leadName);
  if (opts.score !== undefined) body.score = opts.score;
  if (opts.currentContext !== undefined) body.currentContext = opts.currentContext;
  const res = await request(getApp().getHttpServer())
    .post('/tensions')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
  if (res.body.id) tensionIds.set(name, res.body.id);
  return res;
}

// --- CREATE TENSION ---
defineFeature(createFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    tensionIds.clear();
    agentIds.clear();
    userIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Create tension with all fields', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a user exists with name "(.*)"$/, async (name: string) => {
      await createUser(name);
    });

    when(
      'I create a tension with:',
      async (table: { name: string; currentContext: string; potentialFuture: string; score: string }[]) => {
        const row = table[0];
        const agentId = agentIds.values().next().value;
        const leadUserId = userIds.values().next().value;
        response = await request(getApp().getHttpServer())
          .post('/tensions')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            currentContext: row.currentContext,
            potentialFuture: row.potentialFuture,
            score: parseInt(row.score),
            agentId,
            leadUserId,
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a tension with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain a tension with score (\d+)$/, (score: string) => {
      expect(response.body.score).toBe(parseInt(score));
    });

    and(/^the response should contain an agent with name "(.*)"$/, (name: string) => {
      expect(response.body.agent).toBeDefined();
      expect(response.body.agent.name).toBe(name);
    });

    and(/^the response should contain a lead with name "(.*)"$/, (name: string) => {
      expect(response.body.lead).toBeDefined();
      expect(response.body.lead.name).toBe(name);
    });
  });

  test('Create tension with minimal fields defaults score to 5', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    when(/^I create a tension with name "(.*)" and agent "(.*)"$/, async (name: string, agentName: string) => {
      response = await createTension(authCookie, name, { agentName });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a tension with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain a tension with score (\d+)$/, (score: string) => {
      expect(response.body.score).toBe(parseInt(score));
    });
  });

  test('Create tension with missing name fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    when('I create a tension without a name', async () => {
      const agentId = agentIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .post('/tensions')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ agentId });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Create tension with missing agentId fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create a tension without an agentId', async () => {
      response = await request(getApp().getHttpServer())
        .post('/tensions')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: 'No Agent Tension' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Create tension with non-existent agentId fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create a tension with non-existent agentId', async () => {
      response = await request(getApp().getHttpServer())
        .post('/tensions')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Bad Agent', agentId: '00000000-0000-0000-0000-000000000000' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Create tension with non-existent leadUserId fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    when('I create a tension with non-existent leadUserId', async () => {
      const agentId = agentIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .post('/tensions')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          name: 'Bad Lead',
          agentId,
          leadUserId: '00000000-0000-0000-0000-000000000000',
        });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Create tension with score outside range fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    when(/^I create a tension with score (\d+)$/, async (score: string) => {
      const agentId = agentIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .post('/tensions')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: 'High Score', agentId, score: parseInt(score) });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Create tension with score zero fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    when(/^I create a tension with score (\d+)$/, async (score: string) => {
      const agentId = agentIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .post('/tensions')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Zero Score', agentId, score: parseInt(score) });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I create a tension without authentication', async () => {
      response = await request(getApp().getHttpServer())
        .post('/tensions')
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Unauth Tension', agentId: '00000000-0000-0000-0000-000000000000' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- LIST TENSIONS ---
defineFeature(listFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    tensionIds.clear();
    agentIds.clear();
    userIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('List tensions with pagination', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    when(/^I list tensions with page (\d+) and limit (\d+)$/, async (page: string, limit: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/tensions/search?page=${page}&limit=${limit}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) tensions$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(/^the response meta should have total (\d+)$/, (total: string) => {
      expect(response.body.meta.total).toBe(parseInt(total));
    });
  });

  test('Filter tensions by agent', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a tension exists with name "(.*)" for agent "(.*)"$/, async (name: string, agentName: string) => {
      await createTension(authCookie, name, { agentName });
    });

    and(/^a tension exists with name "(.*)" for agent "(.*)"$/, async (name: string, agentName: string) => {
      await createTension(authCookie, name, { agentName });
    });

    when(/^I list tensions filtered by agent "(.*)"$/, async (agentName: string) => {
      const agentId = agentIds.get(agentName);
      response = await request(getApp().getHttpServer())
        .get(`/tensions/search?page=1&limit=10&agentId=${agentId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) tension$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(/^the first tension should have name "(.*)"$/, (name: string) => {
      expect(response.body.data[0].name).toBe(name);
    });
  });

  test('Filter tensions by lead user', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a user exists with name "(.*)"$/, async (name: string) => {
      await createUser(name);
    });

    and(/^a tension exists with name "(.*)" with lead "(.*)"$/, async (name: string, leadName: string) => {
      await createTension(authCookie, name, { leadName });
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    when(/^I list tensions filtered by lead "(.*)"$/, async (leadName: string) => {
      const leadUserId = userIds.get(leadName);
      response = await request(getApp().getHttpServer())
        .get(`/tensions/search?page=1&limit=10&leadUserId=${leadUserId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) tension$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(/^the first tension should have name "(.*)"$/, (name: string) => {
      expect(response.body.data[0].name).toBe(name);
    });
  });

  test('Search tensions by name', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    when(/^I search tensions for "(.*)"$/, async (searchTerm: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/tensions/search?page=1&limit=10&search=${encodeURIComponent(searchTerm)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) tension$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(/^the first tension should have name "(.*)"$/, (name: string) => {
      expect(response.body.data[0].name).toBe(name);
    });
  });
});

// --- GET TENSION ---
defineFeature(getFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    tensionIds.clear();
    agentIds.clear();
    userIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Get tension by ID with all relations', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a user exists with name "(.*)"$/, async (name: string) => {
      await createUser(name);
    });

    and(/^a tension exists with name "(.*)" with lead "(.*)"$/, async (name: string, leadName: string) => {
      await createTension(authCookie, name, { leadName });
    });

    when(/^I get the tension "(.*)"$/, async (name: string) => {
      const id = tensionIds.get(name);
      response = await request(getApp().getHttpServer())
        .get(`/tensions/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a tension with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain an agent with name "(.*)"$/, (name: string) => {
      expect(response.body.agent).toBeDefined();
      expect(response.body.agent.name).toBe(name);
    });

    and(/^the response should contain a lead with name "(.*)"$/, (name: string) => {
      expect(response.body.lead).toBeDefined();
      expect(response.body.lead.name).toBe(name);
    });
  });

  test('Get non-existent tension returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I get a tension with non-existent ID', async () => {
      response = await request(getApp().getHttpServer())
        .get('/tensions/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- UPDATE TENSION ---
defineFeature(updateFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    tensionIds.clear();
    agentIds.clear();
    userIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Update all fields', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a user exists with name "(.*)"$/, async (name: string) => {
      await createUser(name);
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name, { agentName: 'Original Agent' });
    });

    when(
      /^I update the tension "(.*)" with:$/,
      async (name: string, table: { name: string; currentContext: string; potentialFuture: string; score: string }[]) => {
        const id = tensionIds.get(name);
        const row = table[0];
        const newAgentId = agentIds.get('New Agent');
        const newLeadId = userIds.get('New Lead');
        response = await request(getApp().getHttpServer())
          .patch(`/tensions/${id}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            currentContext: row.currentContext,
            potentialFuture: row.potentialFuture,
            score: parseInt(row.score),
            agentId: newAgentId,
            leadUserId: newLeadId,
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a tension with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain a tension with score (\d+)$/, (score: string) => {
      expect(response.body.score).toBe(parseInt(score));
    });

    and(/^the response should contain an agent with name "(.*)"$/, (name: string) => {
      expect(response.body.agent).toBeDefined();
      expect(response.body.agent.name).toBe(name);
    });

    and(/^the response should contain a lead with name "(.*)"$/, (name: string) => {
      expect(response.body.lead).toBeDefined();
      expect(response.body.lead.name).toBe(name);
    });
  });

  test('Partial update only name', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a tension exists with name "(.*)" with score (\d+)$/, async (name: string, score: string) => {
      await createTension(authCookie, name, { score: parseInt(score) });
    });

    when(/^I update the tension "(.*)" with name "(.*)"$/, async (oldName: string, newName: string) => {
      const id = tensionIds.get(oldName);
      response = await request(getApp().getHttpServer())
        .patch(`/tensions/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: newName });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a tension with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain a tension with score (\d+)$/, (score: string) => {
      expect(response.body.score).toBe(parseInt(score));
    });
  });

  test('Update with invalid score fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    when(/^I update the tension "(.*)" with score (\d+)$/, async (name: string, score: string) => {
      const id = tensionIds.get(name);
      response = await request(getApp().getHttpServer())
        .patch(`/tensions/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ score: parseInt(score) });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Update with non-existent agentId fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    when(/^I update the tension "(.*)" with non-existent agentId$/, async (name: string) => {
      const id = tensionIds.get(name);
      response = await request(getApp().getHttpServer())
        .patch(`/tensions/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ agentId: '00000000-0000-0000-0000-000000000000' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Update with non-existent leadUserId fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    when(/^I update the tension "(.*)" with non-existent leadUserId$/, async (name: string) => {
      const id = tensionIds.get(name);
      response = await request(getApp().getHttpServer())
        .patch(`/tensions/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ leadUserId: '00000000-0000-0000-0000-000000000000' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DELETE TENSION ---
defineFeature(deleteFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    tensionIds.clear();
    agentIds.clear();
    userIds.clear();
    exchangeIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Delete tension', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    when(/^I delete the tension "(.*)"$/, async (name: string) => {
      const id = tensionIds.get(name);
      response = await request(getApp().getHttpServer())
        .delete(`/tensions/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Exchanges referencing deleted tension get null tensionId', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    and(
      /^an exchange exists with name "(.*)" referencing tension "(.*)"$/,
      async (exchangeName: string, tensionName: string) => {
        const tensionId = tensionIds.get(tensionName);
        const agentEntries = [...agentIds.values()];
        const res = await request(getApp().getHttpServer())
          .post('/exchanges')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: exchangeName,
            purpose: 'Test exchange',
            tensionId,
            parties: [
              { agentId: agentEntries[0], role: 'seller' },
              { agentId: agentEntries[1], role: 'buyer' },
            ],
          });
        exchangeIds.set(exchangeName, res.body.id);
      },
    );

    when(/^I delete the tension "(.*)"$/, async (name: string) => {
      const id = tensionIds.get(name);
      response = await request(getApp().getHttpServer())
        .delete(`/tensions/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the exchange "(.*)" should have null tensionId$/, async (exchangeName: string) => {
      const exchangeId = exchangeIds.get(exchangeName);
      const res = await request(getApp().getHttpServer())
        .get(`/exchanges/${exchangeId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
      expect(res.body.tension).toBeNull();
      expect(res.body.tensionId).toBeNull();
    });
  });

  test('Delete non-existent tension returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I delete a tension with non-existent ID', async () => {
      response = await request(getApp().getHttpServer())
        .delete('/tensions/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- SEARCH TENSIONS ---
defineFeature(searchFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    tensionIds.clear();
    agentIds.clear();
    userIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Full-text search finds tensions by name', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    when(/^I search the global search for "(.*)"$/, async (searchTerm: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/search?q=${encodeURIComponent(searchTerm)}&limit=10`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the search results should contain a tension with name "(.*)"$/, (name: string) => {
      const tensionResults = response.body.data.filter((r: any) => r.type === 'tension');
      expect(tensionResults.some((r: any) => r.name === name)).toBe(true);
    });
  });

  test('Full-text search finds tensions by currentContext', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(
      /^a tension exists with name "(.*)" with currentContext "(.*)"$/,
      async (name: string, currentContext: string) => {
        await createTension(authCookie, name, { currentContext });
      },
    );

    when(/^I search the global search for "(.*)"$/, async (searchTerm: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/search?q=${encodeURIComponent(searchTerm)}&limit=10`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the search results should contain a tension with name "(.*)"$/, (name: string) => {
      const tensionResults = response.body.data.filter((r: any) => r.type === 'tension');
      expect(tensionResults.some((r: any) => r.name === name)).toBe(true);
    });
  });
});
