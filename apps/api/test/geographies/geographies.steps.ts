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
  path.resolve(__dirname, '../../../../packages/bdd/features/geographies/create-geography.feature'),
);
const readFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/geographies/read-geography.feature'),
);
const updateFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/geographies/update-geography.feature'),
);
const deleteFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/geographies/delete-geography.feature'),
);
const moveFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/geographies/move-geography.feature'),
);

const geographyIds = new Map<string, string>();

async function createGeography(
  authCookie: string,
  name: string,
  code: string,
  type: string,
  parentId?: string,
): Promise<request.Response> {
  const body: Record<string, unknown> = { name, code, type };
  if (parentId) body.parentId = parentId;
  return request(getApp().getHttpServer())
    .post('/geographies')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
}

async function buildTree(
  authCookie: string,
  table: { name: string; code: string; type: string; parent: string }[],
): Promise<void> {
  geographyIds.clear();
  for (const row of table) {
    const parentId = row.parent ? geographyIds.get(row.parent) : undefined;
    const res = await createGeography(authCookie, row.name, row.code, row.type, parentId);
    geographyIds.set(row.name, res.body.id);
  }
}

// --- CREATE GEOGRAPHY ---
defineFeature(createFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    geographyIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Successfully create a root planet', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create a geography with:',
      async (table: { name: string; code: string; type: string }[]) => {
        const row = table[0];
        response = await createGeography(authCookie, row.name, row.code, row.type);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a geography with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain a geography with code "(.*)"$/, (code: string) => {
      expect(response.body.code).toBe(code);
    });

    and(/^the response should contain a geography with type "(.*)"$/, (type: string) => {
      expect(response.body.type).toBe(type);
    });
  });

  test('Successfully create a child continent under planet', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a root planet exists with name "(.*)" and code "(.*)"$/,
      async (name: string, code: string) => {
        const res = await createGeography(authCookie, name, code, 'planet');
        geographyIds.set(name, res.body.id);
      },
    );

    when(
      /^I create a child geography under "(.*)" with:$/,
      async (parentName: string, table: { name: string; code: string; type: string }[]) => {
        const row = table[0];
        const parentId = geographyIds.get(parentName);
        response = await createGeography(authCookie, row.name, row.code, row.type, parentId);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a geography with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain a geography with type "(.*)"$/, (type: string) => {
      expect(response.body.type).toBe(type);
    });
  });

  test('Creating a root geography with non-planet type fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create a geography with:',
      async (table: { name: string; code: string; type: string }[]) => {
        const row = table[0];
        response = await createGeography(authCookie, row.name, row.code, row.type);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Successfully create a child by skipping levels', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a root planet exists with name "(.*)" and code "(.*)"$/,
      async (name: string, code: string) => {
        const res = await createGeography(authCookie, name, code, 'planet');
        geographyIds.set(name, res.body.id);
      },
    );

    and(
      /^a child geography "(.*)" with code "(.*)" and type "(.*)" exists under "(.*)"$/,
      async (name: string, code: string, type: string, parentName: string) => {
        const parentId = geographyIds.get(parentName);
        const res = await createGeography(authCookie, name, code, type, parentId);
        geographyIds.set(name, res.body.id);
      },
    );

    when(
      /^I create a child geography under "(.*)" with:$/,
      async (parentName: string, table: { name: string; code: string; type: string }[]) => {
        const row = table[0];
        const parentId = geographyIds.get(parentName);
        response = await createGeography(authCookie, row.name, row.code, row.type, parentId);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a geography with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain a geography with type "(.*)"$/, (type: string) => {
      expect(response.body.type).toBe(type);
    });
  });

  test('Creating a child with a higher-level type fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a root planet exists with name "(.*)" and code "(.*)"$/,
      async (name: string, code: string) => {
        const res = await createGeography(authCookie, name, code, 'planet');
        geographyIds.set(name, res.body.id);
      },
    );

    and(
      /^a child geography "(.*)" with code "(.*)" and type "(.*)" exists under "(.*)"$/,
      async (name: string, code: string, type: string, parentName: string) => {
        const parentId = geographyIds.get(parentName);
        const res = await createGeography(authCookie, name, code, type, parentId);
        geographyIds.set(name, res.body.id);
      },
    );

    and(
      /^a child geography "(.*)" with code "(.*)" and type "(.*)" exists under "(.*)"$/,
      async (name: string, code: string, type: string, parentName: string) => {
        const parentId = geographyIds.get(parentName);
        const res = await createGeography(authCookie, name, code, type, parentId);
        geographyIds.set(name, res.body.id);
      },
    );

    when(
      /^I create a child geography under "(.*)" with:$/,
      async (parentName: string, table: { name: string; code: string; type: string }[]) => {
        const row = table[0];
        const parentId = geographyIds.get(parentName);
        response = await createGeography(authCookie, row.name, row.code, row.type, parentId);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Creating a geography with duplicate code fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a root planet exists with name "(.*)" and code "(.*)"$/,
      async (name: string, code: string) => {
        const res = await createGeography(authCookie, name, code, 'planet');
        geographyIds.set(name, res.body.id);
      },
    );

    when(
      'I create a geography with:',
      async (table: { name: string; code: string; type: string }[]) => {
        const row = table[0];
        response = await createGeography(authCookie, row.name, row.code, row.type);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Creating a geography without name fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create a geography without name', async () => {
      response = await request(getApp().getHttpServer())
        .post('/geographies')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ code: 'TEST', type: 'planet' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Creating a geography without code fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create a geography without code', async () => {
      response = await request(getApp().getHttpServer())
        .post('/geographies')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Test', type: 'planet' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Creating a geography without type fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create a geography without type', async () => {
      response = await request(getApp().getHttpServer())
        .post('/geographies')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Test', code: 'TEST' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated user cannot create a geography', ({ when, then }) => {
    when('I create a geography without authentication', async () => {
      response = await request(getApp().getHttpServer())
        .post('/geographies')
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Earth', code: 'EARTH', type: 'planet' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- READ GEOGRAPHY ---
defineFeature(readFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    geographyIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Get a geography by ID', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a root planet exists with name "(.*)" and code "(.*)"$/,
      async (name: string, code: string) => {
        const res = await createGeography(authCookie, name, code, 'planet');
        geographyIds.set(name, res.body.id);
      },
    );

    when('I request the geography by its ID', async () => {
      const id = geographyIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .get(`/geographies/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a geography with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Get the geography tree with hierarchy', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following geography tree exists:',
      async (table: { name: string; code: string; type: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when('I request the full geography tree', async () => {
      response = await request(getApp().getHttpServer())
        .get('/geographies/tree')
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

  test('Get a non-existent geography returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I request a geography with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/geographies/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- UPDATE GEOGRAPHY ---
defineFeature(updateFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    geographyIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test("Successfully update a geography's name", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a root planet exists with name "(.*)" and code "(.*)"$/,
      async (name: string, code: string) => {
        const res = await createGeography(authCookie, name, code, 'planet');
        geographyIds.set(name, res.body.id);
      },
    );

    when(/^I update the geography's name to "(.*)"$/, async (name: string) => {
      const id = geographyIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/geographies/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a geography with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test("Successfully update a geography's code", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a root planet exists with name "(.*)" and code "(.*)"$/,
      async (name: string, code: string) => {
        const res = await createGeography(authCookie, name, code, 'planet');
        geographyIds.set(name, res.body.id);
      },
    );

    when(/^I update the geography's code to "(.*)"$/, async (code: string) => {
      const id = geographyIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/geographies/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ code });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a geography with code "(.*)"$/, (code: string) => {
      expect(response.body.code).toBe(code);
    });
  });

  test('Duplicate code on update fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a root planet exists with name "(.*)" and code "(.*)"$/,
      async (name: string, code: string) => {
        const res = await createGeography(authCookie, name, code, 'planet');
        geographyIds.set(name, res.body.id);
      },
    );

    and(
      /^a root planet exists with name "(.*)" and code "(.*)"$/,
      async (name: string, code: string) => {
        const res = await createGeography(authCookie, name, code, 'planet');
        geographyIds.set(name, res.body.id);
      },
    );

    when(
      /^I update the geography "(.*)" code to "(.*)"$/,
      async (name: string, code: string) => {
        const id = geographyIds.get(name);
        response = await request(getApp().getHttpServer())
          .patch(`/geographies/${id}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ code });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Update a non-existent geography returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I update the geography with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/geographies/${id}`)
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

// --- DELETE GEOGRAPHY ---
defineFeature(deleteFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    geographyIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Successfully delete a leaf geography', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a root planet exists with name "(.*)" and code "(.*)"$/,
      async (name: string, code: string) => {
        const res = await createGeography(authCookie, name, code, 'planet');
        geographyIds.set(name, res.body.id);
      },
    );

    when('I delete the geography', async () => {
      const id = geographyIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .delete(`/geographies/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Delete a geography with children cascades', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following geography tree exists:',
      async (table: { name: string; code: string; type: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(/^I delete the geography "(.*)"$/, async (name: string) => {
      const id = geographyIds.get(name);
      response = await request(getApp().getHttpServer())
        .delete(`/geographies/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the geography "(.*)" should not exist$/, async (name: string) => {
      const id = geographyIds.get(name);
      const res = await request(getApp().getHttpServer())
        .get(`/geographies/${id}`)
        .set('Cookie', [authCookie]);
      expect(res.status).toBe(404);
    });

    and(/^the geography "(.*)" should not exist$/, async (name: string) => {
      const id = geographyIds.get(name);
      const res = await request(getApp().getHttpServer())
        .get(`/geographies/${id}`)
        .set('Cookie', [authCookie]);
      expect(res.status).toBe(404);
    });
  });

  test('Delete a non-existent geography returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I delete the geography with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/geographies/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- MOVE GEOGRAPHY ---
defineFeature(moveFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    geographyIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Move a geography to a valid parent', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following geography tree exists:',
      async (table: { name: string; code: string; type: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(
      /^I move "(.*)" to parent "(.*)"$/,
      async (nodeName: string, parentName: string) => {
        const id = geographyIds.get(nodeName);
        const parentId = geographyIds.get(parentName);
        response = await request(getApp().getHttpServer())
          .patch(`/geographies/${id}/move`)
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
        const parentId = geographyIds.get(parentName);
        const childrenRes = await request(getApp().getHttpServer())
          .get(`/geographies/${parentId}/children`)
          .set('Cookie', [authCookie]);
        const names = childrenRes.body.map((c: { name: string }) => c.name);
        expect(names).toContain(childName);
      },
    );
  });

  test('Move a geography by skipping levels', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following geography tree exists:',
      async (table: { name: string; code: string; type: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(
      /^I move "(.*)" to parent "(.*)"$/,
      async (nodeName: string, parentName: string) => {
        const id = geographyIds.get(nodeName);
        const parentId = geographyIds.get(parentName);
        response = await request(getApp().getHttpServer())
          .patch(`/geographies/${id}/move`)
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
        const parentId = geographyIds.get(parentName);
        const childrenRes = await request(getApp().getHttpServer())
          .get(`/geographies/${parentId}/children`)
          .set('Cookie', [authCookie]);
        const names = childrenRes.body.map((c: { name: string }) => c.name);
        expect(names).toContain(childName);
      },
    );
  });

  test('Moving a non-planet geography to root fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following geography tree exists:',
      async (table: { name: string; code: string; type: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(/^I move "(.*)" to root$/, async (nodeName: string) => {
      const id = geographyIds.get(nodeName);
      response = await request(getApp().getHttpServer())
        .patch(`/geographies/${id}/move`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ parentId: null });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Moving to a parent with equal or higher type fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following geography tree exists:',
      async (table: { name: string; code: string; type: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(
      /^I move "(.*)" to parent "(.*)"$/,
      async (nodeName: string, parentName: string) => {
        const id = geographyIds.get(nodeName);
        const parentId = geographyIds.get(parentName);
        response = await request(getApp().getHttpServer())
          .patch(`/geographies/${id}/move`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ parentId });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Move a non-existent geography returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I move geography with ID "(.*)" to root$/,
      async (id: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/geographies/${id}/move`)
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
