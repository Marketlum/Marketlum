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
  path.resolve(__dirname, '../../../../packages/bdd/features/channels/create-channel.feature'),
);
const readFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/channels/read-channel.feature'),
);
const updateFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/channels/update-channel.feature'),
);
const deleteFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/channels/delete-channel.feature'),
);
const moveFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/channels/move-channel.feature'),
);
const searchFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/channels/search-channels.feature'),
);
const exportFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/channels/export-channels.feature'),
);

const channelIds = new Map<string, string>();
const agentIds = new Map<string, string>();

async function createAgent(
  authCookie: string,
  name: string,
): Promise<string> {
  const res = await request(getApp().getHttpServer())
    .post('/agents')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'organization' });
  agentIds.set(name, res.body.id);
  return res.body.id;
}

async function createChannel(
  authCookie: string,
  name: string,
  color: string,
  parentId?: string,
  purpose?: string,
  agentId?: string,
): Promise<request.Response> {
  const body: Record<string, unknown> = { name, color };
  if (parentId) body.parentId = parentId;
  if (purpose) body.purpose = purpose;
  if (agentId) body.agentId = agentId;
  return request(getApp().getHttpServer())
    .post('/channels')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
}

async function buildTree(
  authCookie: string,
  table: { name: string; parent: string }[],
): Promise<void> {
  channelIds.clear();
  for (const row of table) {
    const parentId = row.parent ? channelIds.get(row.parent) : undefined;
    const res = await createChannel(authCookie, row.name, '#000000', parentId);
    channelIds.set(row.name, res.body.id);
  }
}

// --- CREATE CHANNEL ---
defineFeature(createFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    channelIds.clear();
    agentIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Successfully create a root channel with name and color', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create a channel with:',
      async (table: { name: string; color: string }[]) => {
        const row = table[0];
        response = await createChannel(authCookie, row.name, row.color);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a channel with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain a channel with color "(.*)"$/, (color: string) => {
      expect(response.body.color).toBe(color);
    });
  });

  test('Successfully create a root channel with purpose and agent', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    when(
      'I create a channel with purpose and agent:',
      async (table: { name: string; color: string; purpose: string }[]) => {
        const row = table[0];
        const agentId = agentIds.values().next().value;
        response = await createChannel(authCookie, row.name, row.color, undefined, row.purpose, agentId);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a channel with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain a channel with purpose "(.*)"$/, (purpose: string) => {
      expect(response.body.purpose).toBe(purpose);
    });

    and(/^the response should contain a channel with an agent named "(.*)"$/, (agentName: string) => {
      expect(response.body.agent).toBeDefined();
      expect(response.body.agent.name).toBe(agentName);
    });
  });

  test('Successfully create a child channel under parent', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root channel exists with name "(.*)"$/, async (name: string) => {
      const res = await createChannel(authCookie, name, '#000000');
      channelIds.set(name, res.body.id);
    });

    when(
      /^I create a child channel with parent "(.*)":/,
      async (parentName: string, table: { name: string; color: string }[]) => {
        const row = table[0];
        const parentId = channelIds.get(parentName);
        response = await createChannel(authCookie, row.name, row.color, parentId);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a channel with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Creating a channel without name fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create a channel without name', async () => {
      response = await request(getApp().getHttpServer())
        .post('/channels')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ color: '#ff0000' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Creating a channel without color fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create a channel without color', async () => {
      response = await request(getApp().getHttpServer())
        .post('/channels')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Test Channel' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- READ CHANNEL ---
defineFeature(readFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    channelIds.clear();
    agentIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Get a channel by ID', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root channel exists with name "(.*)"$/, async (name: string) => {
      const res = await createChannel(authCookie, name, '#000000');
      channelIds.set(name, res.body.id);
    });

    when('I request the channel by its ID', async () => {
      const id = channelIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .get(`/channels/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a channel with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Get the channel tree', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following channel tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when('I request the full channel tree', async () => {
      response = await request(getApp().getHttpServer())
        .get('/channels/tree')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the tree should contain (\d+) root nodes$/, (count: string) => {
      expect(response.body).toHaveLength(parseInt(count));
    });

    and(
      /^the root "(.*)" should have (\d+) children$/,
      (rootName: string, count: string) => {
        const root = response.body.find((n: { name: string }) => n.name === rootName);
        expect(root).toBeDefined();
        expect(root.children).toHaveLength(parseInt(count));
      },
    );
  });

  test('Get a non-existent channel returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I request a channel with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/channels/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- UPDATE CHANNEL ---
defineFeature(updateFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    channelIds.clear();
    agentIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test("Successfully update a channel's name", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root channel exists with name "(.*)"$/, async (name: string) => {
      const res = await createChannel(authCookie, name, '#000000');
      channelIds.set(name, res.body.id);
    });

    when(/^I update the channel's name to "(.*)"$/, async (name: string) => {
      const id = channelIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/channels/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a channel with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Successfully update purpose, color, and agentId', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a root channel exists with name "(.*)"$/, async (name: string) => {
      const res = await createChannel(authCookie, name, '#000000');
      channelIds.set(name, res.body.id);
    });

    when(
      /^I update the channel with purpose "(.*)" and color "(.*)" and agent "(.*)"$/,
      async (purpose: string, color: string, agentName: string) => {
        const id = channelIds.values().next().value;
        const agentId = agentIds.get(agentName);
        response = await request(getApp().getHttpServer())
          .patch(`/channels/${id}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ purpose, color, agentId });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a channel with purpose "(.*)"$/, (purpose: string) => {
      expect(response.body.purpose).toBe(purpose);
    });

    and(/^the response should contain a channel with color "(.*)"$/, (color: string) => {
      expect(response.body.color).toBe(color);
    });

    and(/^the response should contain a channel with an agent named "(.*)"$/, (agentName: string) => {
      expect(response.body.agent).toBeDefined();
      expect(response.body.agent.name).toBe(agentName);
    });
  });

  test('Clear optional fields', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(
      /^a root channel exists with name "(.*)" and purpose "(.*)" and agent "(.*)"$/,
      async (name: string, purpose: string, agentName: string) => {
        const agentId = agentIds.get(agentName);
        const res = await createChannel(authCookie, name, '#000000', undefined, purpose, agentId);
        channelIds.set(name, res.body.id);
      },
    );

    when('I update the channel to clear purpose and agent', async () => {
      const id = channelIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/channels/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ purpose: null, agentId: null });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should contain a channel with null purpose', () => {
      expect(response.body.purpose).toBeNull();
    });

    and('the response should contain a channel with null agent', () => {
      expect(response.body.agent).toBeNull();
    });
  });

  test('Update a non-existent channel returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I update the channel with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/channels/${id}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DELETE CHANNEL ---
defineFeature(deleteFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    channelIds.clear();
    agentIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Successfully delete a leaf channel', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root channel exists with name "(.*)"$/, async (name: string) => {
      const res = await createChannel(authCookie, name, '#000000');
      channelIds.set(name, res.body.id);
    });

    when('I delete the channel', async () => {
      const id = channelIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .delete(`/channels/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Delete a channel with children cascades', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following channel tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(/^I delete the channel "(.*)"$/, async (name: string) => {
      const id = channelIds.get(name);
      response = await request(getApp().getHttpServer())
        .delete(`/channels/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the channel "(.*)" should not exist$/, async (name: string) => {
      const id = channelIds.get(name);
      const res = await request(getApp().getHttpServer())
        .get(`/channels/${id}`)
        .set('Cookie', [authCookie]);
      expect(res.status).toBe(404);
    });

    and(/^the channel "(.*)" should not exist$/, async (name: string) => {
      const id = channelIds.get(name);
      const res = await request(getApp().getHttpServer())
        .get(`/channels/${id}`)
        .set('Cookie', [authCookie]);
      expect(res.status).toBe(404);
    });
  });

  test('Delete a non-existent channel returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I delete the channel with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/channels/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- MOVE CHANNEL ---
defineFeature(moveFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    channelIds.clear();
    agentIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Move a channel to a new parent', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following channel tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(
      /^I move "(.*)" to parent "(.*)"$/,
      async (nodeName: string, parentName: string) => {
        const id = channelIds.get(nodeName);
        const parentId = channelIds.get(parentName);
        response = await request(getApp().getHttpServer())
          .patch(`/channels/${id}/move`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ parentId });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(
      /^the children of "(.*)" should include "(.*)"$/,
      async (parentName: string, childName: string) => {
        const parentId = channelIds.get(parentName);
        const childrenRes = await request(getApp().getHttpServer())
          .get(`/channels/${parentId}/children`)
          .set('Cookie', [authCookie]);
        const names = childrenRes.body.map((c: { name: string }) => c.name);
        expect(names).toContain(childName);
      },
    );
  });

  test('Move a channel to root', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following channel tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(/^I move "(.*)" to root$/, async (nodeName: string) => {
      const id = channelIds.get(nodeName);
      response = await request(getApp().getHttpServer())
        .patch(`/channels/${id}/move`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ parentId: null });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(
      /^the root channels should include "(.*)"$/,
      async (nodeName: string) => {
        const rootsRes = await request(getApp().getHttpServer())
          .get('/channels/roots')
          .set('Cookie', [authCookie]);
        const names = rootsRes.body.map((r: { name: string }) => r.name);
        expect(names).toContain(nodeName);
      },
    );
  });

  test('Move a non-existent channel returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I move channel with ID "(.*)" to root$/,
      async (id: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/channels/${id}/move`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ parentId: null });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- SEARCH CHANNELS ---
defineFeature(searchFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    channelIds.clear();
    agentIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('List channels with pagination', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following channels exist:',
      async (table: { name: string; color: string }[]) => {
        for (const row of table) {
          await createChannel(authCookie, row.name, row.color);
        }
      },
    );

    when('I request the list of channels', async () => {
      response = await request(getApp().getHttpServer())
        .get('/channels/search')
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

  test('Search channels by name', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following channels exist:',
      async (table: { name: string; color: string }[]) => {
        for (const row of table) {
          await createChannel(authCookie, row.name, row.color);
        }
      },
    );

    when(/^I request the list of channels with search "(.*)"$/, async (search: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/channels/search?search=${encodeURIComponent(search)}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });
  });

  test('Sort channels by name', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following channels exist:',
      async (table: { name: string; color: string }[]) => {
        for (const row of table) {
          await createChannel(authCookie, row.name, row.color);
        }
      },
    );

    when(
      /^I request the list of channels sorted by "(.*)" in "(.*)" order$/,
      async (sortBy: string, sortOrder: string) => {
        response = await request(getApp().getHttpServer())
          .get(`/channels/search?sortBy=${sortBy}&sortOrder=${sortOrder}`)
          .set('Cookie', [authCookie]);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the first returned channel should have name "(.*)"$/, (name: string) => {
      expect(response.body.data[0].name).toBe(name);
    });
  });

  test('Filter channels by agentId', ({ given, when, then, and }) => {
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
      /^a channel exists with name "(.*)" and agent "(.*)"$/,
      async (channelName: string, agentName: string) => {
        const agentId = agentIds.get(agentName);
        const res = await createChannel(authCookie, channelName, '#000000', undefined, undefined, agentId);
        channelIds.set(channelName, res.body.id);
      },
    );

    and(
      /^a channel exists with name "(.*)" and agent "(.*)"$/,
      async (channelName: string, agentName: string) => {
        const agentId = agentIds.get(agentName);
        const res = await createChannel(authCookie, channelName, '#000000', undefined, undefined, agentId);
        channelIds.set(channelName, res.body.id);
      },
    );

    and(
      /^a channel exists with name "(.*)" and agent "(.*)"$/,
      async (channelName: string, agentName: string) => {
        const agentId = agentIds.get(agentName);
        const res = await createChannel(authCookie, channelName, '#000000', undefined, undefined, agentId);
        channelIds.set(channelName, res.body.id);
      },
    );

    when(
      /^I request the list of channels with agentId for "(.*)"$/,
      async (agentName: string) => {
        const agentId = agentIds.get(agentName);
        response = await request(getApp().getHttpServer())
          .get(`/channels/search?agentId=${agentId}`)
          .set('Cookie', [authCookie]);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });
  });

  test('Default sort order is by createdAt descending', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following channels exist:',
      async (table: { name: string; color: string }[]) => {
        for (const row of table) {
          await createChannel(authCookie, row.name, row.color);
        }
      },
    );

    when('I request the list of channels', async () => {
      response = await request(getApp().getHttpServer())
        .get('/channels/search')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the first returned channel should have name "(.*)"$/, (name: string) => {
      expect(response.body.data[0].name).toBe(name);
    });
  });

  test('Empty results when no channels match', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I request the list of channels with search "(.*)"$/, async (search: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/channels/search?search=${encodeURIComponent(search)}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });
  });
});

// --- EXPORT CHANNELS ---
defineFeature(exportFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    channelIds.clear();
    agentIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Export all channels with high limit returns all records', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following channels exist:',
      async (table: { name: string; color: string }[]) => {
        for (const row of table) {
          await createChannel(authCookie, row.name, row.color);
        }
      },
    );

    when(/^I request the list of channels with limit (\d+)$/, async (limit: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/channels/search?limit=${limit}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) channels$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Export channels with search filter', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following channels exist:',
      async (table: { name: string; color: string }[]) => {
        for (const row of table) {
          await createChannel(authCookie, row.name, row.color);
        }
      },
    );

    when(
      /^I request the list of channels with limit (\d+) and search "(.*)"$/,
      async (limit: string, search: string) => {
        response = await request(getApp().getHttpServer())
          .get(`/channels/search?limit=${limit}&search=${encodeURIComponent(search)}`)
          .set('Cookie', [authCookie]);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) channels$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Export channels with sort', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following channels exist:',
      async (table: { name: string; color: string }[]) => {
        for (const row of table) {
          await createChannel(authCookie, row.name, row.color);
        }
      },
    );

    when(
      /^I request the list of channels with limit (\d+) sorted by "(.*)" in "(.*)" order$/,
      async (limit: string, sortBy: string, sortOrder: string) => {
        response = await request(getApp().getHttpServer())
          .get(`/channels/search?limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`)
          .set('Cookie', [authCookie]);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the first returned channel should have name "(.*)"$/, (name: string) => {
      expect(response.body.data[0].name).toBe(name);
    });
  });
});
