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
  path.resolve(__dirname, '../../../../packages/bdd/features/value-streams/create-value-stream.feature'),
);
const getFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/value-streams/get-value-stream.feature'),
);
const getTreeFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/value-streams/get-value-stream-tree.feature'),
);
const updateFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/value-streams/update-value-stream.feature'),
);
const moveFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/value-streams/move-value-stream.feature'),
);
const deleteFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/value-streams/delete-value-stream.feature'),
);
const imageFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/value-streams/assign-value-stream-image.feature'),
);
const leadFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/value-streams/assign-value-stream-lead.feature'),
);
const searchFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/value-streams/search-value-streams.feature'),
);

const valueStreamIds = new Map<string, string>();
const userIds = new Map<string, string>();
const fileIds = new Map<string, string>();

async function createValueStream(
  authCookie: string,
  name: string,
  parentId?: string,
  purpose?: string,
  leadUserId?: string,
  imageId?: string,
): Promise<request.Response> {
  const body: Record<string, unknown> = { name };
  if (parentId) body.parentId = parentId;
  if (purpose) body.purpose = purpose;
  if (leadUserId) body.leadUserId = leadUserId;
  if (imageId) body.imageId = imageId;
  return request(getApp().getHttpServer())
    .post('/value-streams')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
}

async function buildTree(
  authCookie: string,
  table: { name: string; parent: string }[],
): Promise<void> {
  valueStreamIds.clear();
  for (const row of table) {
    const parentId = row.parent ? valueStreamIds.get(row.parent) : undefined;
    const res = await createValueStream(authCookie, row.name, parentId);
    valueStreamIds.set(row.name, res.body.id);
  }
}

async function buildTreeWithPurposes(
  authCookie: string,
  table: { name: string; parent: string; purpose: string }[],
): Promise<void> {
  valueStreamIds.clear();
  for (const row of table) {
    const parentId = row.parent ? valueStreamIds.get(row.parent) : undefined;
    const res = await createValueStream(authCookie, row.name, parentId, row.purpose || undefined);
    valueStreamIds.set(row.name, res.body.id);
  }
}

async function uploadFile(authCookie: string, name: string): Promise<string> {
  const buffer = Buffer.from('test-file-content');
  const res = await request(getApp().getHttpServer())
    .post('/files/upload')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .attach('file', buffer, { filename: name, contentType: 'image/png' });
  fileIds.set(name, res.body.id);
  return res.body.id;
}

// --- CREATE VALUE STREAM ---
defineFeature(createFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    valueStreamIds.clear();
    userIds.clear();
    fileIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Successfully create a root value stream', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create a value stream with:',
      async (table: { name: string; purpose: string }[]) => {
        const row = table[0];
        response = await createValueStream(authCookie, row.name, undefined, row.purpose || undefined);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a value stream with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain a value stream with purpose "(.*)"$/, (purpose: string) => {
      expect(response.body.purpose).toBe(purpose);
    });
  });

  test('Successfully create a child value stream', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root value stream exists with name "(.*)"$/, async (name: string) => {
      const res = await createValueStream(authCookie, name);
      valueStreamIds.set(name, res.body.id);
    });

    when(
      /^I create a value stream with parent "(.*)":/,
      async (parentName: string, table: { name: string; purpose: string }[]) => {
        const row = table[0];
        const parentId = valueStreamIds.get(parentName);
        response = await createValueStream(authCookie, row.name, parentId, row.purpose || undefined);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a value stream with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Create value stream with lead and image', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a user exists with name "(.*)"$/, async (name: string) => {
      const user = await createUserViaService(`${name.toLowerCase().replace(/ /g, '')}@test.com`, 'password123', name);
      userIds.set(name, user.id);
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await uploadFile(authCookie, name);
    });

    when(
      'I create a value stream with lead and image:',
      async (table: { name: string; purpose: string }[]) => {
        const row = table[0];
        const leadUserId = userIds.values().next().value;
        const imageId = fileIds.values().next().value;
        response = await createValueStream(authCookie, row.name, undefined, row.purpose || undefined, leadUserId, imageId);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a value stream with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and('the response should include lead "Lead User"', () => {
      expect(response.body.lead).toBeDefined();
      expect(response.body.lead.name).toBe('Lead User');
    });

    and('the response should include an image', () => {
      expect(response.body.image).toBeDefined();
      expect(response.body.image).not.toBeNull();
    });
  });

  test('Creating a value stream with invalid data fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create a value stream with:',
      async (table: { name: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/value-streams')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, purpose: row.purpose });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Creating a value stream with non-existent parent fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create a value stream with non-existent parent', async () => {
      response = await request(getApp().getHttpServer())
        .post('/value-streams')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Test', parentId: '00000000-0000-0000-0000-000000000000' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      'I create a value stream with:',
      async (table: { name: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/value-streams')
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, purpose: row.purpose });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- GET VALUE STREAM ---
defineFeature(getFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    valueStreamIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Get an existing value stream by ID', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root value stream exists with name "(.*)"$/, async (name: string) => {
      const res = await createValueStream(authCookie, name);
      valueStreamIds.set(name, res.body.id);
    });

    when('I request the value stream by its ID', async () => {
      const id = valueStreamIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .get(`/value-streams/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a value stream with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Get a non-existent value stream returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I request a value stream with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/value-streams/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I request a value stream with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer()).get(`/value-streams/${id}`);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- GET VALUE STREAM TREE ---
defineFeature(getTreeFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    valueStreamIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Get the full value stream tree', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following value stream tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when('I request the full value stream tree', async () => {
      response = await request(getApp().getHttpServer())
        .get('/value-streams/tree')
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

  test('Get root value streams only', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following value stream tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when('I request the root value streams', async () => {
      response = await request(getApp().getHttpServer())
        .get('/value-streams/roots')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) value streams$/, (count: string) => {
      expect(response.body).toHaveLength(parseInt(count));
    });
  });

  test('Get direct children of a value stream', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following value stream tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(/^I request the children of "(.*)"$/, async (name: string) => {
      const id = valueStreamIds.get(name);
      response = await request(getApp().getHttpServer())
        .get(`/value-streams/${id}/children`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) value streams$/, (count: string) => {
      expect(response.body).toHaveLength(parseInt(count));
    });
  });

  test('Get descendants tree of a value stream', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following value stream tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(/^I request the descendants tree of "(.*)"$/, async (name: string) => {
      const id = valueStreamIds.get(name);
      response = await request(getApp().getHttpServer())
        .get(`/value-streams/${id}/descendants`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the descendants tree should contain child "(.*)"$/, (childName: string) => {
      const hasChild = response.body.children?.some(
        (c: { name: string }) => c.name === childName,
      );
      expect(hasChild).toBe(true);
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I request the full value stream tree', async () => {
      response = await request(getApp().getHttpServer()).get('/value-streams/tree');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- UPDATE VALUE STREAM ---
defineFeature(updateFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    valueStreamIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test("Successfully update a value stream's name", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root value stream exists with name "(.*)"$/, async (name: string) => {
      const res = await createValueStream(authCookie, name);
      valueStreamIds.set(name, res.body.id);
    });

    when(/^I update the value stream's name to "(.*)"$/, async (name: string) => {
      const id = valueStreamIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/value-streams/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a value stream with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test("Successfully update a value stream's purpose", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root value stream exists with name "(.*)"$/, async (name: string) => {
      const res = await createValueStream(authCookie, name);
      valueStreamIds.set(name, res.body.id);
    });

    when(/^I update the value stream's purpose to "(.*)"$/, async (purpose: string) => {
      const id = valueStreamIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/value-streams/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ purpose });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a value stream with purpose "(.*)"$/, (purpose: string) => {
      expect(response.body.purpose).toBe(purpose);
    });
  });

  test('Update a non-existent value stream returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I update the value stream with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/value-streams/${id}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Updating with invalid data fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root value stream exists with name "(.*)"$/, async (name: string) => {
      const res = await createValueStream(authCookie, name);
      valueStreamIds.set(name, res.body.id);
    });

    when(/^I update the value stream's name to "(.*)"$/, async (name: string) => {
      const id = valueStreamIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/value-streams/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      /^I update the value stream with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/value-streams/${id}`)
          .set('X-CSRF-Protection', '1')
          .send({ name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- MOVE VALUE STREAM ---
defineFeature(moveFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    valueStreamIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Move a value stream to a different parent', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following value stream tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(
      /^I move "(.*)" to parent "(.*)"$/,
      async (nodeName: string, parentName: string) => {
        const id = valueStreamIds.get(nodeName);
        const parentId = valueStreamIds.get(parentName);
        response = await request(getApp().getHttpServer())
          .patch(`/value-streams/${id}/move`)
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
        const parentId = valueStreamIds.get(parentName);
        const childrenRes = await request(getApp().getHttpServer())
          .get(`/value-streams/${parentId}/children`)
          .set('Cookie', [authCookie]);
        const names = childrenRes.body.map((c: { name: string }) => c.name);
        expect(names).toContain(childName);
      },
    );
  });

  test('Move a value stream to root', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following value stream tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(/^I move "(.*)" to root$/, async (nodeName: string) => {
      const id = valueStreamIds.get(nodeName);
      response = await request(getApp().getHttpServer())
        .patch(`/value-streams/${id}/move`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ parentId: null });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(
      /^the root value streams should include "(.*)"$/,
      async (nodeName: string) => {
        const rootsRes = await request(getApp().getHttpServer())
          .get('/value-streams/roots')
          .set('Cookie', [authCookie]);
        const names = rootsRes.body.map((r: { name: string }) => r.name);
        expect(names).toContain(nodeName);
      },
    );
  });

  test('Move to a non-existent parent fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root value stream exists with name "(.*)"$/, async (name: string) => {
      const res = await createValueStream(authCookie, name);
      valueStreamIds.set(name, res.body.id);
    });

    when(/^I move "(.*)" to non-existent parent$/, async (nodeName: string) => {
      const id = valueStreamIds.get(nodeName);
      response = await request(getApp().getHttpServer())
        .patch(`/value-streams/${id}/move`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ parentId: '00000000-0000-0000-0000-000000000000' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      /^I move value stream with ID "(.*)" to root$/,
      async (id: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/value-streams/${id}/move`)
          .set('X-CSRF-Protection', '1')
          .send({ parentId: null });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DELETE VALUE STREAM ---
defineFeature(deleteFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    valueStreamIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Successfully delete a leaf value stream', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root value stream exists with name "(.*)"$/, async (name: string) => {
      const res = await createValueStream(authCookie, name);
      valueStreamIds.set(name, res.body.id);
    });

    when('I delete the value stream', async () => {
      const id = valueStreamIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .delete(`/value-streams/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Delete a value stream with children cascades', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following value stream tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(/^I delete the value stream "(.*)"$/, async (name: string) => {
      const id = valueStreamIds.get(name);
      response = await request(getApp().getHttpServer())
        .delete(`/value-streams/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the value stream "(.*)" should not exist$/, async (name: string) => {
      const id = valueStreamIds.get(name);
      const res = await request(getApp().getHttpServer())
        .get(`/value-streams/${id}`)
        .set('Cookie', [authCookie]);
      expect(res.status).toBe(404);
    });

    and(/^the value stream "(.*)" should not exist$/, async (name: string) => {
      const id = valueStreamIds.get(name);
      const res = await request(getApp().getHttpServer())
        .get(`/value-streams/${id}`)
        .set('Cookie', [authCookie]);
      expect(res.status).toBe(404);
    });
  });

  test('Delete a non-existent value stream returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I delete the value stream with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/value-streams/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I delete the value stream with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/value-streams/${id}`)
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- ASSIGN IMAGE ---
defineFeature(imageFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    valueStreamIds.clear();
    fileIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Create value stream with image', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await uploadFile(authCookie, name);
    });

    when(
      'I create a value stream with image:',
      async (table: { name: string; purpose: string }[]) => {
        const row = table[0];
        const imageId = fileIds.values().next().value;
        response = await createValueStream(authCookie, row.name, undefined, row.purpose || undefined, undefined, imageId);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should include an image', () => {
      expect(response.body.image).toBeDefined();
      expect(response.body.image).not.toBeNull();
    });
  });

  test('Create value stream with non-existent image fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create a value stream with non-existent image:',
      async (table: { name: string; purpose: string }[]) => {
        const row = table[0];
        response = await createValueStream(authCookie, row.name, undefined, row.purpose || undefined, undefined, '00000000-0000-0000-0000-000000000000');
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Update value stream image', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root value stream exists with name "(.*)"$/, async (name: string) => {
      const res = await createValueStream(authCookie, name);
      valueStreamIds.set(name, res.body.id);
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await uploadFile(authCookie, name);
    });

    when("I update the value stream's image", async () => {
      const id = valueStreamIds.values().next().value;
      const imageId = fileIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/value-streams/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ imageId });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should include an image', () => {
      expect(response.body.image).toBeDefined();
      expect(response.body.image).not.toBeNull();
    });
  });

  test('Remove value stream image', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await uploadFile(authCookie, name);
    });

    and(/^a value stream exists with name "(.*)" and image$/, async (name: string) => {
      const imageId = fileIds.values().next().value;
      const res = await createValueStream(authCookie, name, undefined, undefined, undefined, imageId);
      valueStreamIds.set(name, res.body.id);
    });

    when("I remove the value stream's image", async () => {
      const id = valueStreamIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/value-streams/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ imageId: null });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should have null image', () => {
      expect(response.body.image).toBeNull();
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      'I create a value stream with:',
      async (table: { name: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/value-streams')
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, purpose: row.purpose });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- ASSIGN LEAD ---
defineFeature(leadFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    valueStreamIds.clear();
    userIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Create value stream with lead', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a user exists with name "(.*)"$/, async (name: string) => {
      const user = await createUserViaService(`${name.toLowerCase().replace(/ /g, '')}@test.com`, 'password123', name);
      userIds.set(name, user.id);
    });

    when(
      'I create a value stream with lead:',
      async (table: { name: string; purpose: string }[]) => {
        const row = table[0];
        const leadUserId = userIds.values().next().value;
        response = await createValueStream(authCookie, row.name, undefined, row.purpose || undefined, leadUserId);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include lead "(.*)"$/, (name: string) => {
      expect(response.body.lead).toBeDefined();
      expect(response.body.lead.name).toBe(name);
    });
  });

  test('Create value stream with non-existent lead fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create a value stream with non-existent lead:',
      async (table: { name: string; purpose: string }[]) => {
        const row = table[0];
        response = await createValueStream(authCookie, row.name, undefined, row.purpose || undefined, '00000000-0000-0000-0000-000000000000');
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Update value stream lead', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root value stream exists with name "(.*)"$/, async (name: string) => {
      const res = await createValueStream(authCookie, name);
      valueStreamIds.set(name, res.body.id);
    });

    and(/^a user exists with name "(.*)"$/, async (name: string) => {
      const user = await createUserViaService(`${name.toLowerCase().replace(/ /g, '')}@test.com`, 'password123', name);
      userIds.set(name, user.id);
    });

    when(/^I update the value stream's lead to "(.*)"$/, async (name: string) => {
      const id = valueStreamIds.values().next().value;
      const leadUserId = userIds.get(name);
      response = await request(getApp().getHttpServer())
        .patch(`/value-streams/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ leadUserId });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include lead "(.*)"$/, (name: string) => {
      expect(response.body.lead).toBeDefined();
      expect(response.body.lead.name).toBe(name);
    });
  });

  test('Remove value stream lead', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a user exists with name "(.*)"$/, async (name: string) => {
      const user = await createUserViaService(`${name.toLowerCase().replace(/ /g, '')}@test.com`, 'password123', name);
      userIds.set(name, user.id);
    });

    and(/^a value stream exists with name "(.*)" and lead "(.*)"$/, async (vsName: string, leadName: string) => {
      const leadUserId = userIds.get(leadName);
      const res = await createValueStream(authCookie, vsName, undefined, undefined, leadUserId);
      valueStreamIds.set(vsName, res.body.id);
    });

    when("I remove the value stream's lead", async () => {
      const id = valueStreamIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/value-streams/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ leadUserId: null });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should have null lead', () => {
      expect(response.body.lead).toBeNull();
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      'I create a value stream with:',
      async (table: { name: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/value-streams')
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, purpose: row.purpose });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- SEARCH VALUE STREAMS ---
defineFeature(searchFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    valueStreamIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Search with default pagination', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following value stream tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when('I request the list of value streams', async () => {
      response = await request(getApp().getHttpServer())
        .get('/value-streams/search')
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

  test('Search by name', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following value stream tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(/^I request the list of value streams with search "(.*)"$/, async (search: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/value-streams/search?search=${encodeURIComponent(search)}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });

    and(
      /^all returned value streams should have "(.*)" in their name or purpose$/,
      (term: string) => {
        const lower = term.toLowerCase();
        for (const item of response.body.data) {
          const nameMatch = item.name?.toLowerCase().includes(lower);
          const purposeMatch = item.purpose?.toLowerCase().includes(lower);
          expect(nameMatch || purposeMatch).toBe(true);
        }
      },
    );
  });

  test('Search by purpose', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following value stream tree exists with purposes:',
      async (table: { name: string; parent: string; purpose: string }[]) => {
        await buildTreeWithPurposes(authCookie, table);
      },
    );

    when(/^I request the list of value streams with search "(.*)"$/, async (search: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/value-streams/search?search=${encodeURIComponent(search)}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });

    and(
      /^all returned value streams should have "(.*)" in their name or purpose$/,
      (term: string) => {
        const lower = term.toLowerCase();
        for (const item of response.body.data) {
          const nameMatch = item.name?.toLowerCase().includes(lower);
          const purposeMatch = item.purpose?.toLowerCase().includes(lower);
          expect(nameMatch || purposeMatch).toBe(true);
        }
      },
    );
  });

  test('Sort results', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following value stream tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(
      /^I request the list of value streams sorted by "(.*)" in "(.*)" order$/,
      async (sortBy: string, sortOrder: string) => {
        response = await request(getApp().getHttpServer())
          .get(`/value-streams/search?sortBy=${sortBy}&sortOrder=${sortOrder}`)
          .set('Cookie', [authCookie]);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the first value stream should have name "(.*)"$/, (name: string) => {
      expect(response.body.data[0].name).toBe(name);
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I request the list of value streams', async () => {
      response = await request(getApp().getHttpServer())
        .get('/value-streams/search');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
