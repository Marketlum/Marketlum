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
  path.resolve(__dirname, '../../../../packages/bdd/features/agreement-templates/create-agreement-template.feature'),
);
const searchFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agreement-templates/search-agreement-templates.feature'),
);
const getFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agreement-templates/get-agreement-template.feature'),
);
const updateFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agreement-templates/update-agreement-template.feature'),
);
const moveFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agreement-templates/move-agreement-template.feature'),
);
const deleteFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agreement-templates/delete-agreement-template.feature'),
);
const treeFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agreement-templates/agreement-template-tree.feature'),
);

const templateIds = new Map<string, string>();
const valueStreamIds = new Map<string, string>();

async function createTemplate(
  authCookie: string,
  name: string,
  type: string,
  parentId?: string,
  extra?: { purpose?: string; description?: string; link?: string; valueStreamId?: string },
): Promise<request.Response> {
  const body: Record<string, unknown> = { name, type };
  if (parentId) body.parentId = parentId;
  if (extra?.purpose) body.purpose = extra.purpose;
  if (extra?.description) body.description = extra.description;
  if (extra?.link) body.link = extra.link;
  if (extra?.valueStreamId) body.valueStreamId = extra.valueStreamId;
  return request(getApp().getHttpServer())
    .post('/agreement-templates')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
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

async function buildTree(
  authCookie: string,
  table: { name: string; type: string; parent: string }[],
): Promise<void> {
  templateIds.clear();
  for (const row of table) {
    const parentId = row.parent ? templateIds.get(row.parent) : undefined;
    const res = await createTemplate(authCookie, row.name, row.type, parentId);
    templateIds.set(row.name, res.body.id);
  }
}

async function buildFlatList(
  authCookie: string,
  table: { name: string; type: string; description?: string }[],
): Promise<void> {
  templateIds.clear();
  for (const row of table) {
    const res = await createTemplate(authCookie, row.name, row.type, undefined, {
      description: row.description,
    });
    templateIds.set(row.name, res.body.id);
  }
}

// --- CREATE ---
defineFeature(createFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let pendingValueStreamId: string | undefined;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    templateIds.clear();
    valueStreamIds.clear();
    pendingValueStreamId = undefined;
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Successfully create a root agreement template', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create an agreement template with:',
      async (table: { name: string; type: string }[]) => {
        const row = table[0];
        response = await createTemplate(authCookie, row.name, row.type);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an agreement template with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain an agreement template with type "(.*)"$/, (type: string) => {
      expect(response.body.type).toBe(type);
    });
  });

  test('Successfully create a child agreement template', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a root agreement template exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await createTemplate(authCookie, name, type);
        templateIds.set(name, res.body.id);
      },
    );

    when(
      /^I create an agreement template with parent "(.*)":/,
      async (parentName: string, table: { name: string; type: string }[]) => {
        const row = table[0];
        const parentId = templateIds.get(parentName);
        response = await createTemplate(authCookie, row.name, row.type, parentId);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an agreement template with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain an agreement template with type "(.*)"$/, (type: string) => {
      expect(response.body.type).toBe(type);
    });
  });

  test('Successfully create an agreement template with all fields', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a value stream exists with name "(.*)"$/, async (name: string) => {
      pendingValueStreamId = await createValueStream(authCookie, name);
    });

    when(
      'I create an agreement template with:',
      async (table: { name: string; type: string; purpose: string; description: string; link: string }[]) => {
        const row = table[0];
        response = await createTemplate(authCookie, row.name, row.type, undefined, {
          purpose: row.purpose,
          description: row.description,
          link: row.link,
          valueStreamId: pendingValueStreamId,
        });
      },
    );

    and(
      /^the agreement template references value stream "(.*)"$/,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async (_vsName: string) => {
        // valueStreamId was already set in the previous step
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an agreement template with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain an agreement template with purpose "(.*)"$/, (purpose: string) => {
      expect(response.body.purpose).toBe(purpose);
    });

    and(/^the response should contain an agreement template with description "(.*)"$/, (description: string) => {
      expect(response.body.description).toBe(description);
    });

    and(/^the response should contain an agreement template with link "(.*)"$/, (link: string) => {
      expect(response.body.link).toBe(link);
    });
  });

  test('Creating an agreement template with duplicate name fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a root agreement template exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await createTemplate(authCookie, name, type);
        templateIds.set(name, res.body.id);
      },
    );

    when(
      'I create an agreement template with:',
      async (table: { name: string; type: string }[]) => {
        const row = table[0];
        response = await createTemplate(authCookie, row.name, row.type);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Creating an agreement template with missing name fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create an agreement template with:',
      async (table: { name: string; type: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/agreement-templates')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, type: row.type });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Creating an agreement template with invalid type fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create an agreement template with:',
      async (table: { name: string; type: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/agreement-templates')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, type: row.type });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Creating an agreement template with invalid link fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create an agreement template with:',
      async (table: { name: string; type: string; link: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/agreement-templates')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, type: row.type, link: row.link });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      'I create an agreement template with:',
      async (table: { name: string; type: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/agreement-templates')
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, type: row.type });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- SEARCH ---
defineFeature(searchFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    templateIds.clear();
    valueStreamIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('List agreement templates with pagination', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following agreement templates exist:',
      async (table: { name: string; type: string }[]) => {
        await buildFlatList(authCookie, table);
      },
    );

    when('I request the list of agreement templates', async () => {
      response = await request(getApp().getHttpServer())
        .get('/agreement-templates/search')
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

  test('Search agreement templates by name', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following agreement templates exist:',
      async (table: { name: string; type: string }[]) => {
        await buildFlatList(authCookie, table);
      },
    );

    when(/^I request the list of agreement templates with search "(.*)"$/, async (search: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/agreement-templates/search?search=${encodeURIComponent(search)}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });
  });

  test('Search agreement templates by description', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following agreement templates exist:',
      async (table: { name: string; type: string; description: string }[]) => {
        await buildFlatList(authCookie, table);
      },
    );

    when(/^I request the list of agreement templates with search "(.*)"$/, async (search: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/agreement-templates/search?search=${encodeURIComponent(search)}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });
  });

  test('Filter agreement templates by type', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following agreement templates exist:',
      async (table: { name: string; type: string }[]) => {
        await buildFlatList(authCookie, table);
      },
    );

    when(/^I request the list of agreement templates with type "(.*)"$/, async (type: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/agreement-templates/search?type=${encodeURIComponent(type)}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });
  });

  test('Filter agreement templates by value stream', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a value stream exists with name "(.*)"$/, async (name: string) => {
      await createValueStream(authCookie, name);
    });

    and(
      /^an agreement template exists with name "(.*)" and type "(.*)" and value stream "(.*)"$/,
      async (name: string, type: string, vsName: string) => {
        const vsId = valueStreamIds.get(vsName);
        const res = await createTemplate(authCookie, name, type, undefined, { valueStreamId: vsId });
        templateIds.set(name, res.body.id);
      },
    );

    and(
      /^an agreement template exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await createTemplate(authCookie, name, type);
        templateIds.set(name, res.body.id);
      },
    );

    when(
      /^I request the list of agreement templates with valueStreamId for "(.*)"$/,
      async (vsName: string) => {
        const vsId = valueStreamIds.get(vsName);
        response = await request(getApp().getHttpServer())
          .get(`/agreement-templates/search?valueStreamId=${vsId}`)
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

  test('Sort agreement templates by name', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following agreement templates exist:',
      async (table: { name: string; type: string }[]) => {
        await buildFlatList(authCookie, table);
      },
    );

    when(
      /^I request the list of agreement templates sorted by "(.*)" in "(.*)" order$/,
      async (sortBy: string, sortOrder: string) => {
        response = await request(getApp().getHttpServer())
          .get(`/agreement-templates/search?sortBy=${sortBy}&sortOrder=${sortOrder}`)
          .set('Cookie', [authCookie]);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the first agreement template should have name "(.*)"$/, (name: string) => {
      expect(response.body.data[0].name).toBe(name);
    });
  });

  test('Paginate results', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following agreement templates exist:',
      async (table: { name: string; type: string }[]) => {
        await buildFlatList(authCookie, table);
      },
    );

    when(
      /^I request the list of agreement templates with page (\d+) and limit (\d+)$/,
      async (page: string, limit: string) => {
        response = await request(getApp().getHttpServer())
          .get(`/agreement-templates/search?page=${page}&limit=${limit}`)
          .set('Cookie', [authCookie]);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) agreement templates$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I request the list of agreement templates', async () => {
      response = await request(getApp().getHttpServer())
        .get('/agreement-templates/search');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- GET ---
defineFeature(getFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    templateIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Get an existing agreement template by ID', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a root agreement template exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await createTemplate(authCookie, name, type);
        templateIds.set(name, res.body.id);
      },
    );

    when('I request the agreement template by its ID', async () => {
      const id = templateIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .get(`/agreement-templates/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an agreement template with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Get a non-existent agreement template returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I request an agreement template with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/agreement-templates/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I request an agreement template with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/agreement-templates/${id}`);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- UPDATE ---
defineFeature(updateFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    templateIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test("Successfully update an agreement template's name", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a root agreement template exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await createTemplate(authCookie, name, type);
        templateIds.set(name, res.body.id);
      },
    );

    when(/^I update the agreement template's name to "(.*)"$/, async (name: string) => {
      const id = templateIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/agreement-templates/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an agreement template with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Successfully update optional fields', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a root agreement template exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await createTemplate(authCookie, name, type);
        templateIds.set(name, res.body.id);
      },
    );

    when(
      'I update the agreement template with:',
      async (table: { purpose: string; description: string; link: string }[]) => {
        const row = table[0];
        const id = templateIds.values().next().value;
        response = await request(getApp().getHttpServer())
          .patch(`/agreement-templates/${id}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ purpose: row.purpose, description: row.description, link: row.link });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an agreement template with purpose "(.*)"$/, (purpose: string) => {
      expect(response.body.purpose).toBe(purpose);
    });

    and(/^the response should contain an agreement template with description "(.*)"$/, (description: string) => {
      expect(response.body.description).toBe(description);
    });

    and(/^the response should contain an agreement template with link "(.*)"$/, (link: string) => {
      expect(response.body.link).toBe(link);
    });
  });

  test('Updating to a duplicate name fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a root agreement template exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await createTemplate(authCookie, name, type);
        templateIds.set(name, res.body.id);
      },
    );

    and(
      /^a root agreement template exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await createTemplate(authCookie, name, type);
        templateIds.set(name, res.body.id);
      },
    );

    when(
      /^I update the agreement template "(.*)" with name "(.*)"$/,
      async (templateName: string, newName: string) => {
        const id = templateIds.get(templateName);
        response = await request(getApp().getHttpServer())
          .patch(`/agreement-templates/${id}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name: newName });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Update a non-existent agreement template returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I update the agreement template with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/agreement-templates/${id}`)
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
      /^I update the agreement template with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/agreement-templates/${id}`)
          .set('X-CSRF-Protection', '1')
          .send({ name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- MOVE ---
defineFeature(moveFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    templateIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Move an agreement template to a different parent', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following agreement template tree exists:',
      async (table: { name: string; type: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(
      /^I move "(.*)" to parent "(.*)"$/,
      async (nodeName: string, parentName: string) => {
        const id = templateIds.get(nodeName);
        const parentId = templateIds.get(parentName);
        response = await request(getApp().getHttpServer())
          .patch(`/agreement-templates/${id}/move`)
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
        const parentId = templateIds.get(parentName);
        const childrenRes = await request(getApp().getHttpServer())
          .get(`/agreement-templates/${parentId}/children`)
          .set('Cookie', [authCookie]);
        const names = childrenRes.body.map((c: { name: string }) => c.name);
        expect(names).toContain(childName);
      },
    );
  });

  test('Move an agreement template to root', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following agreement template tree exists:',
      async (table: { name: string; type: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(/^I move "(.*)" to root$/, async (nodeName: string) => {
      const id = templateIds.get(nodeName);
      response = await request(getApp().getHttpServer())
        .patch(`/agreement-templates/${id}/move`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ parentId: null });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(
      /^the root agreement templates should include "(.*)"$/,
      async (nodeName: string) => {
        const rootsRes = await request(getApp().getHttpServer())
          .get('/agreement-templates/roots')
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

    and(
      /^a root agreement template exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await createTemplate(authCookie, name, type);
        templateIds.set(name, res.body.id);
      },
    );

    when(/^I move "(.*)" to non-existent parent$/, async (nodeName: string) => {
      const id = templateIds.get(nodeName);
      response = await request(getApp().getHttpServer())
        .patch(`/agreement-templates/${id}/move`)
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
      /^I move agreement template with ID "(.*)" to root$/,
      async (id: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/agreement-templates/${id}/move`)
          .set('X-CSRF-Protection', '1')
          .send({ parentId: null });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DELETE ---
defineFeature(deleteFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    templateIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Successfully delete a leaf agreement template', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a root agreement template exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await createTemplate(authCookie, name, type);
        templateIds.set(name, res.body.id);
      },
    );

    when('I delete the agreement template', async () => {
      const id = templateIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .delete(`/agreement-templates/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Deleting an agreement template with children is prevented', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following agreement template tree exists:',
      async (table: { name: string; type: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(/^I delete the agreement template "(.*)"$/, async (name: string) => {
      const id = templateIds.get(name);
      response = await request(getApp().getHttpServer())
        .delete(`/agreement-templates/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Delete a non-existent agreement template returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I delete the agreement template with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/agreement-templates/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I delete the agreement template with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/agreement-templates/${id}`)
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- TREE ---
defineFeature(treeFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    templateIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Get the full agreement template tree', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following agreement template tree exists:',
      async (table: { name: string; type: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when('I request the full agreement template tree', async () => {
      response = await request(getApp().getHttpServer())
        .get('/agreement-templates/tree')
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

  test('Get root agreement templates only', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following agreement template tree exists:',
      async (table: { name: string; type: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when('I request the root agreement templates', async () => {
      response = await request(getApp().getHttpServer())
        .get('/agreement-templates/roots')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) agreement templates$/, (count: string) => {
      expect(response.body).toHaveLength(parseInt(count));
    });
  });

  test('Get direct children of an agreement template', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following agreement template tree exists:',
      async (table: { name: string; type: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(/^I request the children of "(.*)"$/, async (name: string) => {
      const id = templateIds.get(name);
      response = await request(getApp().getHttpServer())
        .get(`/agreement-templates/${id}/children`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) agreement templates$/, (count: string) => {
      expect(response.body).toHaveLength(parseInt(count));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I request the full agreement template tree', async () => {
      response = await request(getApp().getHttpServer())
        .get('/agreement-templates/tree');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
