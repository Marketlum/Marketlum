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
  path.resolve(__dirname, '../../../../packages/bdd/features/taxonomies/create-taxonomy.feature'),
);
const getFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/taxonomies/get-taxonomy.feature'),
);
const getTreeFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/taxonomies/get-taxonomy-tree.feature'),
);
const updateFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/taxonomies/update-taxonomy.feature'),
);
const moveFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/taxonomies/move-taxonomy.feature'),
);
const deleteFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/taxonomies/delete-taxonomy.feature'),
);

// Helper: track taxonomy names → IDs
const taxonomyIds = new Map<string, string>();

async function createTaxonomy(
  authCookie: string,
  name: string,
  parentId?: string,
  description?: string,
): Promise<request.Response> {
  const body: Record<string, unknown> = { name };
  if (parentId) body.parentId = parentId;
  if (description) body.description = description;
  return request(getApp().getHttpServer())
    .post('/taxonomies')
    .set('Cookie', [authCookie])
    .send(body);
}

async function buildTree(
  authCookie: string,
  table: { name: string; parent: string }[],
): Promise<void> {
  taxonomyIds.clear();
  for (const row of table) {
    const parentId = row.parent ? taxonomyIds.get(row.parent) : undefined;
    const res = await createTaxonomy(authCookie, row.name, parentId);
    taxonomyIds.set(row.name, res.body.id);
  }
}

// --- CREATE TAXONOMY ---
defineFeature(createFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    taxonomyIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Successfully create a root taxonomy', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create a taxonomy with:',
      async (table: { name: string; description: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/taxonomies')
          .set('Cookie', [authCookie])
          .send({ name: row.name, description: row.description });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a taxonomy with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(
      /^the response should contain a taxonomy with description "(.*)"$/,
      (description: string) => {
        expect(response.body.description).toBe(description);
      },
    );
  });

  test('Successfully create a child taxonomy', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root taxonomy exists with name "(.*)"$/, async (name: string) => {
      const res = await createTaxonomy(authCookie, name);
      taxonomyIds.set(name, res.body.id);
    });

    when(
      /^I create a taxonomy with parent "(.*)":/,
      async (parentName: string, table: { name: string; description: string }[]) => {
        const row = table[0];
        const parentId = taxonomyIds.get(parentName);
        response = await request(getApp().getHttpServer())
          .post('/taxonomies')
          .set('Cookie', [authCookie])
          .send({ name: row.name, description: row.description, parentId });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a taxonomy with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Creating a taxonomy with invalid data fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create a taxonomy with:',
      async (table: { name: string; description: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/taxonomies')
          .set('Cookie', [authCookie])
          .send({ name: row.name, description: row.description });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Creating a taxonomy with non-existent parent fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create a taxonomy with non-existent parent', async () => {
      response = await request(getApp().getHttpServer())
        .post('/taxonomies')
        .set('Cookie', [authCookie])
        .send({ name: 'Test', parentId: '00000000-0000-0000-0000-000000000000' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      'I create a taxonomy with:',
      async (table: { name: string; description: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/taxonomies')
          .send({ name: row.name, description: row.description });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- GET TAXONOMY ---
defineFeature(getFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    taxonomyIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Get an existing taxonomy by ID', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root taxonomy exists with name "(.*)"$/, async (name: string) => {
      const res = await createTaxonomy(authCookie, name);
      taxonomyIds.set(name, res.body.id);
    });

    when('I request the taxonomy by its ID', async () => {
      const id = taxonomyIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .get(`/taxonomies/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a taxonomy with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Get a non-existent taxonomy returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I request a taxonomy with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/taxonomies/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I request a taxonomy with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer()).get(`/taxonomies/${id}`);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- GET TAXONOMY TREE ---
defineFeature(getTreeFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    taxonomyIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Get the full taxonomy tree', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following taxonomy tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when('I request the full taxonomy tree', async () => {
      response = await request(getApp().getHttpServer())
        .get('/taxonomies/tree')
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

  test('Get root taxonomies only', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following taxonomy tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when('I request the root taxonomies', async () => {
      response = await request(getApp().getHttpServer())
        .get('/taxonomies/roots')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) taxonomies$/, (count: string) => {
      expect(response.body).toHaveLength(parseInt(count));
    });
  });

  test('Get direct children of a taxonomy', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following taxonomy tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(/^I request the children of "(.*)"$/, async (name: string) => {
      const id = taxonomyIds.get(name);
      response = await request(getApp().getHttpServer())
        .get(`/taxonomies/${id}/children`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) taxonomies$/, (count: string) => {
      expect(response.body).toHaveLength(parseInt(count));
    });
  });

  test('Get descendants tree of a taxonomy', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following taxonomy tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(/^I request the descendants tree of "(.*)"$/, async (name: string) => {
      const id = taxonomyIds.get(name);
      response = await request(getApp().getHttpServer())
        .get(`/taxonomies/${id}/descendants`)
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
    when('I request the full taxonomy tree', async () => {
      response = await request(getApp().getHttpServer()).get('/taxonomies/tree');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- UPDATE TAXONOMY ---
defineFeature(updateFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    taxonomyIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test("Successfully update a taxonomy's name", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root taxonomy exists with name "(.*)"$/, async (name: string) => {
      const res = await createTaxonomy(authCookie, name);
      taxonomyIds.set(name, res.body.id);
    });

    when(/^I update the taxonomy's name to "(.*)"$/, async (name: string) => {
      const id = taxonomyIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/taxonomies/${id}`)
        .set('Cookie', [authCookie])
        .send({ name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a taxonomy with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Update a non-existent taxonomy returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I update the taxonomy with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/taxonomies/${id}`)
          .set('Cookie', [authCookie])
          .send({ name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      /^I update the taxonomy with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/taxonomies/${id}`)
          .send({ name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- MOVE TAXONOMY ---
defineFeature(moveFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    taxonomyIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Move a taxonomy to a different parent', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following taxonomy tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(
      /^I move "(.*)" to parent "(.*)"$/,
      async (nodeName: string, parentName: string) => {
        const id = taxonomyIds.get(nodeName);
        const parentId = taxonomyIds.get(parentName);
        response = await request(getApp().getHttpServer())
          .patch(`/taxonomies/${id}/move`)
          .set('Cookie', [authCookie])
          .send({ parentId });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(
      /^the children of "(.*)" should include "(.*)"$/,
      async (parentName: string, childName: string) => {
        const parentId = taxonomyIds.get(parentName);
        const childrenRes = await request(getApp().getHttpServer())
          .get(`/taxonomies/${parentId}/children`)
          .set('Cookie', [authCookie]);
        const names = childrenRes.body.map((c: { name: string }) => c.name);
        expect(names).toContain(childName);
      },
    );
  });

  test('Move a taxonomy to root', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following taxonomy tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(/^I move "(.*)" to root$/, async (nodeName: string) => {
      const id = taxonomyIds.get(nodeName);
      response = await request(getApp().getHttpServer())
        .patch(`/taxonomies/${id}/move`)
        .set('Cookie', [authCookie])
        .send({ parentId: null });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(
      /^the root taxonomies should include "(.*)"$/,
      async (nodeName: string) => {
        const rootsRes = await request(getApp().getHttpServer())
          .get('/taxonomies/roots')
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

    and(/^a root taxonomy exists with name "(.*)"$/, async (name: string) => {
      const res = await createTaxonomy(authCookie, name);
      taxonomyIds.set(name, res.body.id);
    });

    when(/^I move "(.*)" to non-existent parent$/, async (nodeName: string) => {
      const id = taxonomyIds.get(nodeName);
      response = await request(getApp().getHttpServer())
        .patch(`/taxonomies/${id}/move`)
        .set('Cookie', [authCookie])
        .send({ parentId: '00000000-0000-0000-0000-000000000000' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      /^I move taxonomy with ID "(.*)" to root$/,
      async (id: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/taxonomies/${id}/move`)
          .send({ parentId: null });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DELETE TAXONOMY ---
defineFeature(deleteFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    taxonomyIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Successfully delete a leaf taxonomy', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root taxonomy exists with name "(.*)"$/, async (name: string) => {
      const res = await createTaxonomy(authCookie, name);
      taxonomyIds.set(name, res.body.id);
    });

    when('I delete the taxonomy', async () => {
      const id = taxonomyIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .delete(`/taxonomies/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Delete a taxonomy with children cascades', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following taxonomy tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(/^I delete the taxonomy "(.*)"$/, async (name: string) => {
      const id = taxonomyIds.get(name);
      response = await request(getApp().getHttpServer())
        .delete(`/taxonomies/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the taxonomy "(.*)" should not exist$/, async (name: string) => {
      const id = taxonomyIds.get(name);
      const res = await request(getApp().getHttpServer())
        .get(`/taxonomies/${id}`)
        .set('Cookie', [authCookie]);
      expect(res.status).toBe(404);
    });

    and(/^the taxonomy "(.*)" should not exist$/, async (name: string) => {
      const id = taxonomyIds.get(name);
      const res = await request(getApp().getHttpServer())
        .get(`/taxonomies/${id}`)
        .set('Cookie', [authCookie]);
      expect(res.status).toBe(404);
    });
  });

  test('Delete a non-existent taxonomy returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I delete the taxonomy with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/taxonomies/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I delete the taxonomy with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer()).delete(`/taxonomies/${id}`);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
