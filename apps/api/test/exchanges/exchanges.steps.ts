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
  path.resolve(__dirname, '../../../../packages/bdd/features/exchanges/create-exchange.feature'),
);
const getFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/exchanges/get-exchange.feature'),
);
const searchFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/exchanges/search-exchanges.feature'),
);
const updateFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/exchanges/update-exchange.feature'),
);
const deleteFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/exchanges/delete-exchange.feature'),
);
const createFlowFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/exchanges/create-exchange-flow.feature'),
);
const getFlowFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/exchanges/get-exchange-flow.feature'),
);
const listFlowsFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/exchanges/list-exchange-flows.feature'),
);
const updateFlowFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/exchanges/update-exchange-flow.feature'),
);
const deleteFlowFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/exchanges/delete-exchange-flow.feature'),
);
const transitionFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/exchanges/transition-exchange.feature'),
);

const exchangeIds = new Map<string, string>();
const agentIds = new Map<string, string>();
const valueIds = new Map<string, string>();
const valueInstanceIds = new Map<string, string>();
const valueStreamIds = new Map<string, string>();
const channelIds = new Map<string, string>();
const pipelineIds = new Map<string, string>();
const userIds = new Map<string, string>();
const flowIds = new Map<string, string>();

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

async function createChannel(authCookie: string, name: string): Promise<string> {
  const res = await request(getApp().getHttpServer())
    .post('/channels')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, color: '#ff0000' });
  channelIds.set(name, res.body.id);
  return res.body.id;
}

async function createPipeline(authCookie: string, name: string, color: string): Promise<string> {
  const res = await request(getApp().getHttpServer())
    .post('/pipelines')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, color });
  pipelineIds.set(name, res.body.id);
  return res.body.id;
}

async function createUser(authCookie: string, name: string): Promise<string> {
  const user = await createUserViaService(
    `${name.toLowerCase().replace(/\s/g, '.')}@test.com`,
    'password123',
    name,
  );
  userIds.set(name, user.id);
  return user.id;
}

async function createExchange(
  authCookie: string,
  name: string,
  opts: {
    purpose?: string;
    partyNames?: string[];
    state?: string;
    valueStreamName?: string;
    channelName?: string;
    leadUserName?: string;
  } = {},
): Promise<request.Response> {
  const partyNames = opts.partyNames || [...agentIds.keys()].slice(0, 2);
  const parties = partyNames.map((n, i) => ({
    agentId: agentIds.get(n)!,
    role: i === 0 ? 'seller' : 'buyer',
  }));
  const body: Record<string, unknown> = {
    name,
    purpose: opts.purpose || 'General exchange',
    parties,
  };
  if (opts.valueStreamName) body.valueStreamId = valueStreamIds.get(opts.valueStreamName);
  if (opts.channelName) body.channelId = channelIds.get(opts.channelName);
  if (opts.leadUserName) body.leadUserId = userIds.get(opts.leadUserName);

  const res = await request(getApp().getHttpServer())
    .post('/exchanges')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
  exchangeIds.set(name, res.body.id);

  // If a specific state is requested, transition to it
  if (opts.state && opts.state !== 'open') {
    if (opts.state === 'closed') {
      await request(getApp().getHttpServer())
        .post(`/exchanges/${res.body.id}/transitions`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ action: 'close' });
    } else if (opts.state === 'completed') {
      await request(getApp().getHttpServer())
        .post(`/exchanges/${res.body.id}/transitions`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ action: 'complete' });
    }
  }

  return res;
}

async function createFlow(
  authCookie: string,
  exchangeName: string,
  opts: {
    valueName?: string;
    valueInstanceName?: string;
    fromAgentName: string;
    toAgentName: string;
    quantity: string;
  },
): Promise<request.Response> {
  const exchangeId = exchangeIds.get(exchangeName)!;
  const body: Record<string, unknown> = {
    fromAgentId: agentIds.get(opts.fromAgentName)!,
    toAgentId: agentIds.get(opts.toAgentName)!,
    quantity: opts.quantity,
  };
  if (opts.valueName) body.valueId = valueIds.get(opts.valueName)!;
  if (opts.valueInstanceName) body.valueInstanceId = valueInstanceIds.get(opts.valueInstanceName)!;

  const res = await request(getApp().getHttpServer())
    .post(`/exchanges/${exchangeId}/flows`)
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
  if (res.body.id) {
    flowIds.set(`${exchangeName}-${opts.valueName || opts.valueInstanceName}`, res.body.id);
  }
  return res;
}

function clearMaps() {
  exchangeIds.clear();
  agentIds.clear();
  valueIds.clear();
  valueInstanceIds.clear();
  valueStreamIds.clear();
  channelIds.clear();
  pipelineIds.clear();
  userIds.clear();
  flowIds.clear();
}

// --- CREATE EXCHANGE ---
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

  test('Create exchange with all fields', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a value stream exists with name "(.*)"$/, async (name: string) => {
      await createValueStream(authCookie, name);
    });

    and(/^a channel exists with name "(.*)"$/, async (name: string) => {
      await createChannel(authCookie, name);
    });

    and(/^a user exists with name "(.*)"$/, async (name: string) => {
      await createUser(authCookie, name);
    });

    when(
      'I create an exchange with:',
      async (table: { name: string; purpose: string; description: string; link: string }[]) => {
        const row = table[0];
        const agentNames = [...agentIds.keys()];
        response = await request(getApp().getHttpServer())
          .post('/exchanges')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            purpose: row.purpose,
            description: row.description,
            link: row.link,
            valueStreamId: valueStreamIds.values().next().value,
            channelId: channelIds.values().next().value,
            leadUserId: userIds.values().next().value,
            parties: [
              { agentId: agentIds.get(agentNames[0])!, role: 'seller' },
              { agentId: agentIds.get(agentNames[1])!, role: 'buyer' },
            ],
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an exchange with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain an exchange with purpose "(.*)"$/, (purpose: string) => {
      expect(response.body.purpose).toBe(purpose);
    });

    and(/^the response should contain an exchange with state "(.*)"$/, (state: string) => {
      expect(response.body.state).toBe(state);
    });

    and('the response should contain an openedAt timestamp', () => {
      expect(response.body.openedAt).toBeDefined();
    });

    and(/^the response should contain (\d+) parties$/, (count: string) => {
      expect(response.body.parties).toHaveLength(parseInt(count));
    });

    and(/^the response should contain a valueStream with name "(.*)"$/, (name: string) => {
      expect(response.body.valueStream).toBeDefined();
      expect(response.body.valueStream.name).toBe(name);
    });

    and(/^the response should contain a channel with name "(.*)"$/, (name: string) => {
      expect(response.body.channel).toBeDefined();
      expect(response.body.channel.name).toBe(name);
    });

    and(/^the response should contain a lead with name "(.*)"$/, (name: string) => {
      expect(response.body.lead).toBeDefined();
      expect(response.body.lead.name).toBe(name);
    });
  });

  test('State defaults to open with openedAt set automatically', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    when(/^I create a minimal exchange with name "(.*)"$/, async (name: string) => {
      const agentNames = [...agentIds.keys()];
      response = await request(getApp().getHttpServer())
        .post('/exchanges')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          name,
          purpose: 'Minimal exchange',
          parties: [
            { agentId: agentIds.get(agentNames[0])!, role: 'party1' },
            { agentId: agentIds.get(agentNames[1])!, role: 'party2' },
          ],
        });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an exchange with state "(.*)"$/, (state: string) => {
      expect(response.body.state).toBe(state);
    });

    and('the response should contain an openedAt timestamp', () => {
      expect(response.body.openedAt).toBeDefined();
    });

    and('the response completedAt should be null', () => {
      expect(response.body.completedAt).toBeNull();
    });
  });

  test('Reject fewer than 2 parties', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    when('I create an exchange with 1 party', async () => {
      const agentName = [...agentIds.keys()][0];
      response = await request(getApp().getHttpServer())
        .post('/exchanges')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          name: 'Test',
          purpose: 'Test',
          parties: [{ agentId: agentIds.get(agentName)!, role: 'solo' }],
        });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Reject missing required fields', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    when('I create an exchange with empty name', async () => {
      const agentNames = [...agentIds.keys()];
      response = await request(getApp().getHttpServer())
        .post('/exchanges')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          name: '',
          purpose: 'Test',
          parties: [
            { agentId: agentIds.get(agentNames[0])!, role: 'a' },
            { agentId: agentIds.get(agentNames[1])!, role: 'b' },
          ],
        });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Reject non-existent agent in parties', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    when('I create an exchange with a non-existent party agent', async () => {
      const realAgentId = agentIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .post('/exchanges')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          name: 'Test',
          purpose: 'Test',
          parties: [
            { agentId: realAgentId, role: 'real' },
            { agentId: '00000000-0000-0000-0000-000000000000', role: 'fake' },
          ],
        });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Reject non-existent valueStream reference', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    when('I create an exchange with a non-existent valueStream', async () => {
      const agentNames = [...agentIds.keys()];
      response = await request(getApp().getHttpServer())
        .post('/exchanges')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          name: 'Test',
          purpose: 'Test',
          valueStreamId: '00000000-0000-0000-0000-000000000000',
          parties: [
            { agentId: agentIds.get(agentNames[0])!, role: 'a' },
            { agentId: agentIds.get(agentNames[1])!, role: 'b' },
          ],
        });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Reject duplicate agent in parties', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    when('I create an exchange with duplicate agent in parties', async () => {
      const agentId = agentIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .post('/exchanges')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          name: 'Test',
          purpose: 'Test',
          parties: [
            { agentId, role: 'buyer' },
            { agentId, role: 'seller' },
          ],
        });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Create exchange with pipeline', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a pipeline exists with name "(.*)" and color "(.*)"$/, async (name: string, color: string) => {
      await createPipeline(authCookie, name, color);
    });

    when(
      /^I create an exchange with pipeline "(.*)" and:$/,
      async (pipelineName: string, table: { name: string; purpose: string }[]) => {
        const row = table[0];
        const agentNames = [...agentIds.keys()];
        response = await request(getApp().getHttpServer())
          .post('/exchanges')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            purpose: row.purpose,
            pipelineId: pipelineIds.get(pipelineName),
            parties: [
              { agentId: agentIds.get(agentNames[0])!, role: 'seller' },
              { agentId: agentIds.get(agentNames[1])!, role: 'buyer' },
            ],
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an exchange with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain a pipeline with name "(.*)"$/, (name: string) => {
      expect(response.body.pipeline).not.toBeNull();
      expect(response.body.pipeline.name).toBe(name);
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I create an exchange without authentication', async () => {
      response = await request(getApp().getHttpServer())
        .post('/exchanges')
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Test', purpose: 'Test' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- GET EXCHANGE ---
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

  test('Get an existing exchange by ID', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    when('I request the exchange by its ID', async () => {
      const id = exchangeIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .get(`/exchanges/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an exchange with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain (\d+) parties$/, (count: string) => {
      expect(response.body.parties).toHaveLength(parseInt(count));
    });

    and(/^the response should contain a party with agent "(.*)"$/, (name: string) => {
      const party = response.body.parties.find((p: any) => p.agent.name === name);
      expect(party).toBeDefined();
    });

    and(/^the response should contain a party with agent "(.*)"$/, (name: string) => {
      const party = response.body.parties.find((p: any) => p.agent.name === name);
      expect(party).toBeDefined();
    });
  });

  test('Get a non-existent exchange returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I request an exchange with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/exchanges/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I request an exchange with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer()).get(`/exchanges/${id}`);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- SEARCH EXCHANGES ---
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

  test('Search exchanges with default pagination', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    when('I search exchanges', async () => {
      response = await request(getApp().getHttpServer())
        .get('/exchanges/search')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) exchanges$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Search exchanges by text filter', ({ given, when, then, and }) => {
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
      /^an exchange exists with name "(.*)" and purpose "(.*)"$/,
      async (name: string, purpose: string) => {
        await createExchange(authCookie, name, { purpose });
      },
    );

    and(
      /^an exchange exists with name "(.*)" and purpose "(.*)"$/,
      async (name: string, purpose: string) => {
        await createExchange(authCookie, name, { purpose });
      },
    );

    and(
      /^an exchange exists with name "(.*)" and purpose "(.*)"$/,
      async (name: string, purpose: string) => {
        await createExchange(authCookie, name, { purpose });
      },
    );

    when(/^I search exchanges with text "(.*)"$/, async (search: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/exchanges/search?search=${encodeURIComponent(search)}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) exchange$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Filter exchanges by state', ({ given, when, then, and }) => {
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
      /^an exchange exists with name "(.*)" and state "(.*)"$/,
      async (name: string, state: string) => {
        await createExchange(authCookie, name, { state });
      },
    );

    and(
      /^an exchange exists with name "(.*)" and state "(.*)"$/,
      async (name: string, state: string) => {
        await createExchange(authCookie, name, { state });
      },
    );

    when(/^I search exchanges with state "(.*)"$/, async (state: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/exchanges/search?state=${state}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) exchange$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Filter exchanges by channelId', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a channel exists with name "(.*)"$/, async (name: string) => {
      await createChannel(authCookie, name);
    });

    and(
      /^an exchange exists with name "(.*)" and channel "(.*)"$/,
      async (name: string, channelName: string) => {
        await createExchange(authCookie, name, { channelName });
      },
    );

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    when('I search exchanges with channelId filter', async () => {
      const channelId = channelIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .get(`/exchanges/search?channelId=${channelId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) exchange$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Filter exchanges by valueStreamId', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a value stream exists with name "(.*)"$/, async (name: string) => {
      await createValueStream(authCookie, name);
    });

    and(
      /^an exchange exists with name "(.*)" and valueStream "(.*)"$/,
      async (name: string, vsName: string) => {
        await createExchange(authCookie, name, { valueStreamName: vsName });
      },
    );

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    when('I search exchanges with valueStreamId filter', async () => {
      const vsId = valueStreamIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .get(`/exchanges/search?valueStreamId=${vsId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) exchange$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Filter exchanges by partyAgentId', ({ given, when, then, and }) => {
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

    and(
      /^an exchange exists with name "(.*)" with parties "(.*)" and "(.*)"$/,
      async (name: string, p1: string, p2: string) => {
        await createExchange(authCookie, name, { partyNames: [p1, p2] });
      },
    );

    and(
      /^an exchange exists with name "(.*)" with parties "(.*)" and "(.*)"$/,
      async (name: string, p1: string, p2: string) => {
        await createExchange(authCookie, name, { partyNames: [p1, p2] });
      },
    );

    when(/^I search exchanges with partyAgentId for "(.*)"$/, async (agentName: string) => {
      const agentId = agentIds.get(agentName);
      response = await request(getApp().getHttpServer())
        .get(`/exchanges/search?partyAgentId=${agentId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) exchange$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Filter exchanges by leadUserId', ({ given, when, then, and }) => {
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
      await createUser(authCookie, name);
    });

    and(
      /^an exchange exists with name "(.*)" and lead "(.*)"$/,
      async (name: string, leadName: string) => {
        await createExchange(authCookie, name, { leadUserName: leadName });
      },
    );

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    when('I search exchanges with leadUserId filter', async () => {
      const userId = userIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .get(`/exchanges/search?leadUserId=${userId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) exchange$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Sort exchanges by name ascending', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    when('I search exchanges sorted by name ascending', async () => {
      response = await request(getApp().getHttpServer())
        .get('/exchanges/search?sortBy=name&sortOrder=ASC')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the first exchange should have name "(.*)"$/, (name: string) => {
      expect(response.body.data[0].name).toBe(name);
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

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    when('I search exchanges', async () => {
      response = await request(getApp().getHttpServer())
        .get('/exchanges/search')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the first exchange should have name "(.*)"$/, (name: string) => {
      expect(response.body.data[0].name).toBe(name);
    });
  });
});

// --- UPDATE EXCHANGE ---
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

  test('Update exchange scalar fields', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    when(/^I update the exchange's name to "(.*)"$/, async (name: string) => {
      const id = exchangeIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/exchanges/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an exchange with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Update exchange relations', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a value stream exists with name "(.*)"$/, async (name: string) => {
      await createValueStream(authCookie, name);
    });

    and(/^a channel exists with name "(.*)"$/, async (name: string) => {
      await createChannel(authCookie, name);
    });

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    when("I update the exchange's valueStream and channel", async () => {
      const id = exchangeIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/exchanges/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          valueStreamId: valueStreamIds.values().next().value,
          channelId: channelIds.values().next().value,
        });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a valueStream with name "(.*)"$/, (name: string) => {
      expect(response.body.valueStream).toBeDefined();
      expect(response.body.valueStream.name).toBe(name);
    });

    and(/^the response should contain a channel with name "(.*)"$/, (name: string) => {
      expect(response.body.channel).toBeDefined();
      expect(response.body.channel.name).toBe(name);
    });
  });

  test('Replace exchange parties', ({ given, when, then, and }) => {
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

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name, { partyNames: ['Agent A', 'Agent B'] });
    });

    when(
      /^I replace the exchange parties with "(.*)" and "(.*)"$/,
      async (p1: string, p2: string) => {
        const id = exchangeIds.values().next().value;
        response = await request(getApp().getHttpServer())
          .patch(`/exchanges/${id}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            parties: [
              { agentId: agentIds.get(p1)!, role: 'new-seller' },
              { agentId: agentIds.get(p2)!, role: 'new-buyer' },
            ],
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) parties$/, (count: string) => {
      expect(response.body.parties).toHaveLength(parseInt(count));
    });

    and(/^the response should contain a party with agent "(.*)"$/, (name: string) => {
      const party = response.body.parties.find((p: any) => p.agent.name === name);
      expect(party).toBeDefined();
    });

    and(/^the response should contain a party with agent "(.*)"$/, (name: string) => {
      const party = response.body.parties.find((p: any) => p.agent.name === name);
      expect(party).toBeDefined();
    });
  });

  test('Set and clear exchange pipeline', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a pipeline exists with name "(.*)" and color "(.*)"$/, async (name: string, color: string) => {
      await createPipeline(authCookie, name, color);
    });

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    when(/^I update the exchange's pipeline to "(.*)"$/, async (pipelineName: string) => {
      const id = exchangeIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/exchanges/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ pipelineId: pipelineIds.get(pipelineName) });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a pipeline with name "(.*)"$/, (name: string) => {
      expect(response.body.pipeline).not.toBeNull();
      expect(response.body.pipeline.name).toBe(name);
    });

    when("I clear the exchange's pipeline", async () => {
      const id = exchangeIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/exchanges/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ pipelineId: null });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response pipeline should be null', () => {
      expect(response.body.pipeline).toBeNull();
    });
  });

  test('Update a non-existent exchange returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I update the exchange with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/exchanges/${id}`)
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
      /^I update the exchange with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/exchanges/${id}`)
          .set('X-CSRF-Protection', '1')
          .send({ name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- TRANSITION EXCHANGE ---
defineFeature(transitionFeature, (test) => {
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

  test('Close an open exchange', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    when(/^I transition the exchange with action "(.*)"$/, async (action: string) => {
      const id = exchangeIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .post(`/exchanges/${id}/transitions`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ action });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an exchange with state "(.*)"$/, (state: string) => {
      expect(response.body.state).toBe(state);
    });
  });

  test('Complete an open exchange', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    when(/^I transition the exchange with action "(.*)"$/, async (action: string) => {
      const id = exchangeIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .post(`/exchanges/${id}/transitions`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ action });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an exchange with state "(.*)"$/, (state: string) => {
      expect(response.body.state).toBe(state);
    });

    and('the response should contain a completedAt timestamp', () => {
      expect(response.body.completedAt).toBeDefined();
      expect(response.body.completedAt).not.toBeNull();
    });
  });

  test('Reopen a closed exchange', ({ given, when, then, and }) => {
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
      /^an exchange exists with name "(.*)" and state "(.*)"$/,
      async (name: string, state: string) => {
        await createExchange(authCookie, name, { state });
      },
    );

    when(/^I transition the exchange with action "(.*)"$/, async (action: string) => {
      const id = exchangeIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .post(`/exchanges/${id}/transitions`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ action });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an exchange with state "(.*)"$/, (state: string) => {
      expect(response.body.state).toBe(state);
    });
  });

  test('Reject transition from completed state', ({ given, when, then, and }) => {
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
      /^an exchange exists with name "(.*)" and state "(.*)"$/,
      async (name: string, state: string) => {
        await createExchange(authCookie, name, { state });
      },
    );

    when(/^I transition the exchange with action "(.*)"$/, async (action: string) => {
      const id = exchangeIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .post(`/exchanges/${id}/transitions`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ action });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Reject transition from closed to completed', ({ given, when, then, and }) => {
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
      /^an exchange exists with name "(.*)" and state "(.*)"$/,
      async (name: string, state: string) => {
        await createExchange(authCookie, name, { state });
      },
    );

    when(/^I transition the exchange with action "(.*)"$/, async (action: string) => {
      const id = exchangeIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .post(`/exchanges/${id}/transitions`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ action });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Non-existent exchange returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I transition the exchange with ID "(.*)" with action "(.*)"$/,
      async (id: string, action: string) => {
        response = await request(getApp().getHttpServer())
          .post(`/exchanges/${id}/transitions`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ action });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      /^I transition the exchange with ID "(.*)" with action "(.*)"$/,
      async (id: string, action: string) => {
        response = await request(getApp().getHttpServer())
          .post(`/exchanges/${id}/transitions`)
          .set('X-CSRF-Protection', '1')
          .send({ action });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DELETE EXCHANGE ---
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

  test('Delete an existing exchange', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    when('I delete the exchange', async () => {
      const id = exchangeIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .delete(`/exchanges/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Delete a non-existent exchange returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I delete the exchange with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/exchanges/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I delete the exchange with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/exchanges/${id}`)
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- CREATE EXCHANGE FLOW ---
defineFeature(createFlowFeature, (test) => {
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

  test('Create flow with value reference', ({ given, when, then, and }) => {
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

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    when(
      /^I create a flow with value "(.*)" from "(.*)" to "(.*)" with quantity "(.*)"$/,
      async (valueName: string, from: string, to: string, quantity: string) => {
        const exchangeId = exchangeIds.values().next().value;
        response = await request(getApp().getHttpServer())
          .post(`/exchanges/${exchangeId}/flows`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            valueId: valueIds.get(valueName)!,
            fromAgentId: agentIds.get(from)!,
            toAgentId: agentIds.get(to)!,
            quantity,
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a flow with quantity "(.*)"$/, (quantity: string) => {
      expect(response.body.quantity).toBe(quantity);
    });

    and(/^the response should contain a flow with value "(.*)"$/, (name: string) => {
      expect(response.body.value).toBeDefined();
      expect(response.body.value.name).toBe(name);
    });

    and(/^the response should contain a flow fromAgent "(.*)"$/, (name: string) => {
      expect(response.body.fromAgent).toBeDefined();
      expect(response.body.fromAgent.name).toBe(name);
    });

    and(/^the response should contain a flow toAgent "(.*)"$/, (name: string) => {
      expect(response.body.toAgent).toBeDefined();
      expect(response.body.toAgent.name).toBe(name);
    });
  });

  test('Create flow with valueInstance reference', ({ given, when, then, and }) => {
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
      /^a value instance exists with name "(.*)" for value "(.*)"$/,
      async (name: string, valueName: string) => {
        const valueId = valueIds.get(valueName)!;
        await createValueInstance(authCookie, name, valueId);
      },
    );

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    when(
      /^I create a flow with valueInstance "(.*)" from "(.*)" to "(.*)" with quantity "(.*)"$/,
      async (instanceName: string, from: string, to: string, quantity: string) => {
        const exchangeId = exchangeIds.values().next().value;
        response = await request(getApp().getHttpServer())
          .post(`/exchanges/${exchangeId}/flows`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            valueInstanceId: valueInstanceIds.get(instanceName)!,
            fromAgentId: agentIds.get(from)!,
            toAgentId: agentIds.get(to)!,
            quantity,
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a flow with quantity "(.*)"$/, (quantity: string) => {
      expect(response.body.quantity).toBe(quantity);
    });

    and(/^the response should contain a flow with valueInstance "(.*)"$/, (name: string) => {
      expect(response.body.valueInstance).toBeDefined();
      expect(response.body.valueInstance.name).toBe(name);
    });
  });

  test('Reject non-party fromAgent', ({ given, when, then, and }) => {
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

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name, { partyNames: ['Agent A', 'Agent B'] });
    });

    when(
      /^I create a flow with value "(.*)" from "(.*)" to "(.*)" with quantity "(.*)"$/,
      async (valueName: string, from: string, to: string, quantity: string) => {
        const exchangeId = exchangeIds.values().next().value;
        response = await request(getApp().getHttpServer())
          .post(`/exchanges/${exchangeId}/flows`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            valueId: valueIds.get(valueName)!,
            fromAgentId: agentIds.get(from)!,
            toAgentId: agentIds.get(to)!,
            quantity,
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Reject non-party toAgent', ({ given, when, then, and }) => {
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

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name, { partyNames: ['Agent A', 'Agent B'] });
    });

    when(
      /^I create a flow with value "(.*)" from "(.*)" to "(.*)" with quantity "(.*)"$/,
      async (valueName: string, from: string, to: string, quantity: string) => {
        const exchangeId = exchangeIds.values().next().value;
        response = await request(getApp().getHttpServer())
          .post(`/exchanges/${exchangeId}/flows`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            valueId: valueIds.get(valueName)!,
            fromAgentId: agentIds.get(from)!,
            toAgentId: agentIds.get(to)!,
            quantity,
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Reject flow with both value and valueInstance', ({ given, when, then, and }) => {
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
      /^a value instance exists with name "(.*)" for value "(.*)"$/,
      async (name: string, valueName: string) => {
        const valueId = valueIds.get(valueName)!;
        await createValueInstance(authCookie, name, valueId);
      },
    );

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    when('I create a flow with both value and valueInstance', async () => {
      const exchangeId = exchangeIds.values().next().value;
      const agentNames = [...agentIds.keys()];
      response = await request(getApp().getHttpServer())
        .post(`/exchanges/${exchangeId}/flows`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          valueId: valueIds.values().next().value,
          valueInstanceId: valueInstanceIds.values().next().value,
          fromAgentId: agentIds.get(agentNames[0])!,
          toAgentId: agentIds.get(agentNames[1])!,
          quantity: '1.00',
        });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Reject flow with neither value nor valueInstance', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    when('I create a flow with neither value nor valueInstance', async () => {
      const exchangeId = exchangeIds.values().next().value;
      const agentNames = [...agentIds.keys()];
      response = await request(getApp().getHttpServer())
        .post(`/exchanges/${exchangeId}/flows`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          fromAgentId: agentIds.get(agentNames[0])!,
          toAgentId: agentIds.get(agentNames[1])!,
          quantity: '1.00',
        });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      /^I create a flow for exchange "(.*)" without authentication$/,
      async (exchangeId: string) => {
        response = await request(getApp().getHttpServer())
          .post(`/exchanges/${exchangeId}/flows`)
          .set('X-CSRF-Protection', '1')
          .send({ quantity: '1.00' });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- GET EXCHANGE FLOW ---
defineFeature(getFlowFeature, (test) => {
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

  test('Get a flow by ID with relations', ({ given, when, then, and }) => {
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

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    and(
      /^a flow exists with value "(.*)" from "(.*)" to "(.*)" with quantity "(.*)"$/,
      async (valueName: string, from: string, to: string, quantity: string) => {
        const res = await createFlow(authCookie, 'Trade Deal', {
          valueName,
          fromAgentName: from,
          toAgentName: to,
          quantity,
        });
        flowIds.set('main', res.body.id);
      },
    );

    when('I request the flow by its ID', async () => {
      const exchangeId = exchangeIds.values().next().value;
      const flowId = flowIds.get('main')!;
      response = await request(getApp().getHttpServer())
        .get(`/exchanges/${exchangeId}/flows/${flowId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a flow with quantity "(.*)"$/, (quantity: string) => {
      expect(response.body.quantity).toBe(quantity);
    });

    and(/^the response should contain a flow with value "(.*)"$/, (name: string) => {
      expect(response.body.value).toBeDefined();
      expect(response.body.value.name).toBe(name);
    });
  });

  test('Get a non-existent flow returns 404', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    when(/^I request a flow with ID "(.*)"$/, async (flowId: string) => {
      const exchangeId = exchangeIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .get(`/exchanges/${exchangeId}/flows/${flowId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      /^I request a flow for exchange "(.*)" with ID "(.*)"$/,
      async (exchangeId: string, flowId: string) => {
        response = await request(getApp().getHttpServer())
          .get(`/exchanges/${exchangeId}/flows/${flowId}`);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- LIST EXCHANGE FLOWS ---
defineFeature(listFlowsFeature, (test) => {
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

  test('List all flows for an exchange', ({ given, when, then, and }) => {
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

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    and(
      /^a flow exists with value "(.*)" from "(.*)" to "(.*)" with quantity "(.*)"$/,
      async (valueName: string, from: string, to: string, quantity: string) => {
        await createFlow(authCookie, 'Trade Deal', {
          valueName,
          fromAgentName: from,
          toAgentName: to,
          quantity,
        });
      },
    );

    and(
      /^a flow exists with value "(.*)" from "(.*)" to "(.*)" with quantity "(.*)"$/,
      async (valueName: string, from: string, to: string, quantity: string) => {
        await createFlow(authCookie, 'Trade Deal', {
          valueName,
          fromAgentName: from,
          toAgentName: to,
          quantity,
        });
      },
    );

    when('I list flows for the exchange', async () => {
      const exchangeId = exchangeIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .get(`/exchanges/${exchangeId}/flows`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) flows$/, (count: string) => {
      expect(response.body).toHaveLength(parseInt(count));
    });
  });

  test('Empty array for exchange with no flows', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    when('I list flows for the exchange', async () => {
      const exchangeId = exchangeIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .get(`/exchanges/${exchangeId}/flows`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) flows$/, (count: string) => {
      expect(response.body).toHaveLength(parseInt(count));
    });
  });
});

// --- UPDATE EXCHANGE FLOW ---
defineFeature(updateFlowFeature, (test) => {
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

  test('Update flow quantity', ({ given, when, then, and }) => {
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

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    and(
      /^a flow exists with value "(.*)" from "(.*)" to "(.*)" with quantity "(.*)"$/,
      async (valueName: string, from: string, to: string, quantity: string) => {
        const res = await createFlow(authCookie, 'Trade Deal', {
          valueName,
          fromAgentName: from,
          toAgentName: to,
          quantity,
        });
        flowIds.set('main', res.body.id);
      },
    );

    when(/^I update the flow's quantity to "(.*)"$/, async (quantity: string) => {
      const exchangeId = exchangeIds.values().next().value;
      const flowId = flowIds.get('main')!;
      response = await request(getApp().getHttpServer())
        .patch(`/exchanges/${exchangeId}/flows/${flowId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ quantity });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a flow with quantity "(.*)"$/, (quantity: string) => {
      expect(response.body.quantity).toBe(quantity);
    });
  });

  test('Update flow agents (must be parties)', ({ given, when, then, and }) => {
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

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    and(
      /^a flow exists with value "(.*)" from "(.*)" to "(.*)" with quantity "(.*)"$/,
      async (valueName: string, from: string, to: string, quantity: string) => {
        const res = await createFlow(authCookie, 'Trade Deal', {
          valueName,
          fromAgentName: from,
          toAgentName: to,
          quantity,
        });
        flowIds.set('main', res.body.id);
      },
    );

    when('I update the flow to swap from and to agents', async () => {
      const exchangeId = exchangeIds.values().next().value;
      const flowId = flowIds.get('main')!;
      response = await request(getApp().getHttpServer())
        .patch(`/exchanges/${exchangeId}/flows/${flowId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          fromAgentId: agentIds.get('Agent B')!,
          toAgentId: agentIds.get('Agent A')!,
        });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a flow fromAgent "(.*)"$/, (name: string) => {
      expect(response.body.fromAgent.name).toBe(name);
    });

    and(/^the response should contain a flow toAgent "(.*)"$/, (name: string) => {
      expect(response.body.toAgent.name).toBe(name);
    });
  });

  test('Reject non-party agent on update', ({ given, when, then, and }) => {
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

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name, { partyNames: ['Agent A', 'Agent B'] });
    });

    and(
      /^a flow exists with value "(.*)" from "(.*)" to "(.*)" with quantity "(.*)"$/,
      async (valueName: string, from: string, to: string, quantity: string) => {
        const res = await createFlow(authCookie, 'Trade Deal', {
          valueName,
          fromAgentName: from,
          toAgentName: to,
          quantity,
        });
        flowIds.set('main', res.body.id);
      },
    );

    when(/^I update the flow's fromAgent to "(.*)"$/, async (agentName: string) => {
      const exchangeId = exchangeIds.values().next().value;
      const flowId = flowIds.get('main')!;
      response = await request(getApp().getHttpServer())
        .patch(`/exchanges/${exchangeId}/flows/${flowId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ fromAgentId: agentIds.get(agentName)! });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Update a non-existent flow returns 404', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    when(/^I update the flow with ID "(.*)"$/, async (flowId: string) => {
      const exchangeId = exchangeIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/exchanges/${exchangeId}/flows/${flowId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ quantity: '5.00' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      /^I update the flow for exchange "(.*)" with ID "(.*)"$/,
      async (exchangeId: string, flowId: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/exchanges/${exchangeId}/flows/${flowId}`)
          .set('X-CSRF-Protection', '1')
          .send({ quantity: '5.00' });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DELETE EXCHANGE FLOW ---
defineFeature(deleteFlowFeature, (test) => {
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

  test('Delete an existing flow', ({ given, when, then, and }) => {
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

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    and(
      /^a flow exists with value "(.*)" from "(.*)" to "(.*)" with quantity "(.*)"$/,
      async (valueName: string, from: string, to: string, quantity: string) => {
        const res = await createFlow(authCookie, 'Trade Deal', {
          valueName,
          fromAgentName: from,
          toAgentName: to,
          quantity,
        });
        flowIds.set('main', res.body.id);
      },
    );

    when('I delete the flow', async () => {
      const exchangeId = exchangeIds.values().next().value;
      const flowId = flowIds.get('main')!;
      response = await request(getApp().getHttpServer())
        .delete(`/exchanges/${exchangeId}/flows/${flowId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Delete a non-existent flow returns 404', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an exchange exists with name "(.*)"$/, async (name: string) => {
      await createExchange(authCookie, name);
    });

    when(/^I delete the flow with ID "(.*)"$/, async (flowId: string) => {
      const exchangeId = exchangeIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .delete(`/exchanges/${exchangeId}/flows/${flowId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      /^I delete the flow for exchange "(.*)" with ID "(.*)"$/,
      async (exchangeId: string, flowId: string) => {
        response = await request(getApp().getHttpServer())
          .delete(`/exchanges/${exchangeId}/flows/${flowId}`)
          .set('X-CSRF-Protection', '1');
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
