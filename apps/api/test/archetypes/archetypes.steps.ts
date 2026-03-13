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
  path.resolve(__dirname, '../../../../packages/bdd/features/archetypes/create-archetype.feature'),
);
const getFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/archetypes/get-archetype.feature'),
);
const updateFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/archetypes/update-archetype.feature'),
);
const deleteFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/archetypes/delete-archetype.feature'),
);
const searchFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/archetypes/search-archetypes.feature'),
);
const imageFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/archetypes/assign-archetype-image.feature'),
);

const archetypeIds = new Map<string, string>();
const taxonomyIds = new Map<string, string>();

async function createTaxonomy(authCookie: string, name: string): Promise<string> {
  const res = await request(getApp().getHttpServer())
    .post('/taxonomies')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name });
  taxonomyIds.set(name, res.body.id);
  return res.body.id;
}

async function createArchetype(
  authCookie: string,
  name: string,
  opts: {
    purpose?: string;
    description?: string;
    taxonomyIds?: string[];
  } = {},
): Promise<request.Response> {
  const body: Record<string, unknown> = { name };
  if (opts.purpose) body.purpose = opts.purpose;
  if (opts.description) body.description = opts.description;
  if (opts.taxonomyIds) body.taxonomyIds = opts.taxonomyIds;
  return request(getApp().getHttpServer())
    .post('/archetypes')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
}

// --- CREATE ARCHETYPE ---
defineFeature(createFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    archetypeIds.clear();
    taxonomyIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Create archetype with all fields', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create an archetype with:',
      async (table: { name: string; purpose: string; description: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/archetypes')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            purpose: row.purpose,
            description: row.description,
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an archetype with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain an archetype with purpose "(.*)"$/, (purpose: string) => {
      expect(response.body.purpose).toBe(purpose);
    });

    and(/^the response should contain an archetype with description "(.*)"$/, (desc: string) => {
      expect(response.body.description).toBe(desc);
    });
  });

  test('Create archetype with only name', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create an archetype with:', async (table: { name: string }[]) => {
      const row = table[0];
      response = await createArchetype(authCookie, row.name);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an archetype with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Create archetype with taxonomies', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(authCookie, name);
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(authCookie, name);
    });

    when(
      /^I create an archetype with taxonomies "(.*)" and:$/,
      async (taxonomyNames: string, table: { name: string }[]) => {
        const row = table[0];
        const names = taxonomyNames.split(',');
        const ids = names.map((n) => taxonomyIds.get(n.trim())!);
        response = await createArchetype(authCookie, row.name, {
          taxonomyIds: ids,
        });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an archetype with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain (\d+) taxonomies$/, (count: string) => {
      expect(response.body.taxonomies).toHaveLength(parseInt(count));
    });
  });

  test('Create archetype with empty name fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create an archetype with empty name', async () => {
      response = await request(getApp().getHttpServer())
        .post('/archetypes')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: '' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Create archetype with duplicate name fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an archetype exists with name "(.*)"$/, async (name: string) => {
      const res = await createArchetype(authCookie, name);
      archetypeIds.set(name, res.body.id);
    });

    when('I create an archetype with:', async (table: { name: string }[]) => {
      const row = table[0];
      response = await createArchetype(authCookie, row.name);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Create archetype with non-existent taxonomy fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create an archetype with non-existent taxonomy', async () => {
      response = await createArchetype(authCookie, 'Test', {
        taxonomyIds: ['00000000-0000-0000-0000-000000000000'],
      });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I create an archetype without authentication', async () => {
      response = await request(getApp().getHttpServer())
        .post('/archetypes')
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Test' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- GET ARCHETYPE ---
defineFeature(getFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    archetypeIds.clear();
    taxonomyIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Get an existing archetype by ID', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an archetype exists with name "(.*)"$/, async (name: string) => {
      const res = await createArchetype(authCookie, name);
      archetypeIds.set(name, res.body.id);
    });

    when('I request the archetype by its ID', async () => {
      const id = archetypeIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .get(`/archetypes/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an archetype with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Get archetype with taxonomies loaded', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(authCookie, name);
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(authCookie, name);
    });

    and(
      /^an archetype exists with name "(.*)" and taxonomies "(.*)"$/,
      async (name: string, taxonomyNames: string) => {
        const names = taxonomyNames.split(',');
        const ids = names.map((n) => taxonomyIds.get(n.trim())!);
        const res = await createArchetype(authCookie, name, { taxonomyIds: ids });
        archetypeIds.set(name, res.body.id);
      },
    );

    when('I request the archetype by its ID', async () => {
      const id = archetypeIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .get(`/archetypes/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an archetype with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain (\d+) taxonomies$/, (count: string) => {
      expect(response.body.taxonomies).toHaveLength(parseInt(count));
    });
  });

  test('Get a non-existent archetype returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I request an archetype with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/archetypes/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I request an archetype with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer()).get(`/archetypes/${id}`);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- UPDATE ARCHETYPE ---
defineFeature(updateFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    archetypeIds.clear();
    taxonomyIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Update archetype name', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an archetype exists with name "(.*)"$/, async (name: string) => {
      const res = await createArchetype(authCookie, name);
      archetypeIds.set(name, res.body.id);
    });

    when(/^I update the archetype's name to "(.*)"$/, async (name: string) => {
      const id = archetypeIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/archetypes/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an archetype with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Update archetype purpose and description', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an archetype exists with name "(.*)"$/, async (name: string) => {
      const res = await createArchetype(authCookie, name);
      archetypeIds.set(name, res.body.id);
    });

    when(
      'I update the archetype with:',
      async (table: { purpose: string; description: string }[]) => {
        const row = table[0];
        const id = archetypeIds.values().next().value;
        response = await request(getApp().getHttpServer())
          .patch(`/archetypes/${id}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ purpose: row.purpose, description: row.description });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an archetype with purpose "(.*)"$/, (purpose: string) => {
      expect(response.body.purpose).toBe(purpose);
    });

    and(/^the response should contain an archetype with description "(.*)"$/, (desc: string) => {
      expect(response.body.description).toBe(desc);
    });
  });

  test('Replace archetype taxonomies', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(authCookie, name);
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(authCookie, name);
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(authCookie, name);
    });

    and(
      /^an archetype exists with name "(.*)" and taxonomies "(.*)"$/,
      async (name: string, taxonomyNames: string) => {
        const names = taxonomyNames.split(',');
        const ids = names.map((n) => taxonomyIds.get(n.trim())!);
        const res = await createArchetype(authCookie, name, { taxonomyIds: ids });
        archetypeIds.set(name, res.body.id);
      },
    );

    when(
      /^I replace the archetype taxonomies with "(.*)"$/,
      async (taxonomyNames: string) => {
        const id = archetypeIds.values().next().value;
        const names = taxonomyNames.split(',');
        const ids = names.map((n) => taxonomyIds.get(n.trim())!);
        response = await request(getApp().getHttpServer())
          .patch(`/archetypes/${id}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ taxonomyIds: ids });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) taxonomies$/, (count: string) => {
      expect(response.body.taxonomies).toHaveLength(parseInt(count));
    });

    and(
      /^the taxonomies should include "(.*)" and "(.*)"$/,
      (tax1: string, tax2: string) => {
        const names = response.body.taxonomies.map(
          (t: { name: string }) => t.name,
        );
        expect(names).toContain(tax1);
        expect(names).toContain(tax2);
      },
    );
  });

  test('Clear archetype taxonomies', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(authCookie, name);
    });

    and(
      /^an archetype exists with name "(.*)" and taxonomies "(.*)"$/,
      async (name: string, taxonomyNames: string) => {
        const names = taxonomyNames.split(',');
        const ids = names.map((n) => taxonomyIds.get(n.trim())!);
        const res = await createArchetype(authCookie, name, { taxonomyIds: ids });
        archetypeIds.set(name, res.body.id);
      },
    );

    when('I replace the archetype taxonomies with an empty list', async () => {
      const id = archetypeIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/archetypes/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ taxonomyIds: [] });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) taxonomies$/, (count: string) => {
      expect(response.body.taxonomies).toHaveLength(parseInt(count));
    });
  });

  test('Update with duplicate name fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an archetype exists with name "(.*)"$/, async (name: string) => {
      const res = await createArchetype(authCookie, name);
      archetypeIds.set(name, res.body.id);
    });

    and(/^an archetype exists with name "(.*)"$/, async (name: string) => {
      const res = await createArchetype(authCookie, name);
      archetypeIds.set(name, res.body.id);
    });

    when(
      /^I update the archetype "(.*)" name to "(.*)"$/,
      async (currentName: string, newName: string) => {
        const id = archetypeIds.get(currentName)!;
        response = await request(getApp().getHttpServer())
          .patch(`/archetypes/${id}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name: newName });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Update a non-existent archetype returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I update the archetype with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/archetypes/${id}`)
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
      /^I update the archetype with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/archetypes/${id}`)
          .set('X-CSRF-Protection', '1')
          .send({ name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DELETE ARCHETYPE ---
defineFeature(deleteFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    archetypeIds.clear();
    taxonomyIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Delete an existing archetype', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an archetype exists with name "(.*)"$/, async (name: string) => {
      const res = await createArchetype(authCookie, name);
      archetypeIds.set(name, res.body.id);
    });

    when('I delete the archetype', async () => {
      const id = archetypeIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .delete(`/archetypes/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Delete archetype with taxonomies removes join records', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(authCookie, name);
    });

    and(
      /^an archetype exists with name "(.*)" and taxonomies "(.*)"$/,
      async (name: string, taxonomyNames: string) => {
        const names = taxonomyNames.split(',');
        const ids = names.map((n) => taxonomyIds.get(n.trim())!);
        const res = await createArchetype(authCookie, name, { taxonomyIds: ids });
        archetypeIds.set(name, res.body.id);
      },
    );

    when('I delete the archetype', async () => {
      const id = archetypeIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .delete(`/archetypes/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Deleting a taxonomy removes it from archetype', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(authCookie, name);
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(authCookie, name);
    });

    and(
      /^an archetype exists with name "(.*)" and taxonomies "(.*)"$/,
      async (name: string, taxonomyNames: string) => {
        const names = taxonomyNames.split(',');
        const ids = names.map((n) => taxonomyIds.get(n.trim())!);
        const res = await createArchetype(authCookie, name, { taxonomyIds: ids });
        archetypeIds.set(name, res.body.id);
      },
    );

    when(/^I delete the taxonomy "(.*)"$/, async (name: string) => {
      const id = taxonomyIds.get(name)!;
      await request(getApp().getHttpServer())
        .delete(`/taxonomies/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    and('I request the archetype by its ID', async () => {
      const id = archetypeIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .get(`/archetypes/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) taxonomy$/, (count: string) => {
      expect(response.body.taxonomies).toHaveLength(parseInt(count));
    });
  });

  test('Delete a non-existent archetype returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I delete the archetype with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/archetypes/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I delete the archetype with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/archetypes/${id}`)
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- SEARCH ARCHETYPES ---
defineFeature(searchFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    archetypeIds.clear();
    taxonomyIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Search with default pagination', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an archetype exists with name "(.*)"$/, async (name: string) => {
      await createArchetype(authCookie, name);
    });

    and(/^an archetype exists with name "(.*)"$/, async (name: string) => {
      await createArchetype(authCookie, name);
    });

    and(/^an archetype exists with name "(.*)"$/, async (name: string) => {
      await createArchetype(authCookie, name);
    });

    when('I search archetypes', async () => {
      response = await request(getApp().getHttpServer())
        .get('/archetypes/search')
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

    and(/^an archetype exists with name "(.*)"$/, async (name: string) => {
      await createArchetype(authCookie, name);
    });

    and(/^an archetype exists with name "(.*)"$/, async (name: string) => {
      await createArchetype(authCookie, name);
    });

    and(/^an archetype exists with name "(.*)"$/, async (name: string) => {
      await createArchetype(authCookie, name);
    });

    when(/^I search archetypes with search "(.*)"$/, async (search: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/archetypes/search?search=${encodeURIComponent(search)}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });
  });

  test('Search by purpose text', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^an archetype exists with name "(.*)" and purpose "(.*)"$/,
      async (name: string, purpose: string) => {
        await createArchetype(authCookie, name, { purpose });
      },
    );

    and(
      /^an archetype exists with name "(.*)" and purpose "(.*)"$/,
      async (name: string, purpose: string) => {
        await createArchetype(authCookie, name, { purpose });
      },
    );

    and(
      /^an archetype exists with name "(.*)" and purpose "(.*)"$/,
      async (name: string, purpose: string) => {
        await createArchetype(authCookie, name, { purpose });
      },
    );

    when(/^I search archetypes with search "(.*)"$/, async (search: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/archetypes/search?search=${encodeURIComponent(search)}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });
  });

  test('Filter by taxonomyId', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(authCookie, name);
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(authCookie, name);
    });

    and(
      /^an archetype exists with name "(.*)" and taxonomies "(.*)"$/,
      async (name: string, taxonomyNames: string) => {
        const names = taxonomyNames.split(',');
        const ids = names.map((n) => taxonomyIds.get(n.trim())!);
        await createArchetype(authCookie, name, { taxonomyIds: ids });
      },
    );

    and(
      /^an archetype exists with name "(.*)" and taxonomies "(.*)"$/,
      async (name: string, taxonomyNames: string) => {
        const names = taxonomyNames.split(',');
        const ids = names.map((n) => taxonomyIds.get(n.trim())!);
        await createArchetype(authCookie, name, { taxonomyIds: ids });
      },
    );

    and(
      /^an archetype exists with name "(.*)" and taxonomies "(.*)"$/,
      async (name: string, taxonomyNames: string) => {
        const names = taxonomyNames.split(',');
        const ids = names.map((n) => taxonomyIds.get(n.trim())!);
        await createArchetype(authCookie, name, { taxonomyIds: ids });
      },
    );

    when(/^I search archetypes with taxonomyId for "(.*)"$/, async (taxName: string) => {
      const taxonomyId = taxonomyIds.get(taxName);
      response = await request(getApp().getHttpServer())
        .get(`/archetypes/search?taxonomyId=${taxonomyId}`)
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

    and(/^an archetype exists with name "(.*)"$/, async (name: string) => {
      await createArchetype(authCookie, name);
    });

    and(/^an archetype exists with name "(.*)"$/, async (name: string) => {
      await createArchetype(authCookie, name);
    });

    and(/^an archetype exists with name "(.*)"$/, async (name: string) => {
      await createArchetype(authCookie, name);
    });

    when(
      /^I search archetypes sorted by "(.*)" "(.*)"$/,
      async (sortBy: string, sortOrder: string) => {
        response = await request(getApp().getHttpServer())
          .get(`/archetypes/search?sortBy=${sortBy}&sortOrder=${sortOrder}`)
          .set('Cookie', [authCookie]);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the first archetype should have name "(.*)"$/, (name: string) => {
      expect(response.body.data[0].name).toBe(name);
    });
  });

  test('Default sort by createdAt descending', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an archetype exists with name "(.*)"$/, async (name: string) => {
      await createArchetype(authCookie, name);
    });

    and(/^an archetype exists with name "(.*)"$/, async (name: string) => {
      await createArchetype(authCookie, name);
    });

    and(/^an archetype exists with name "(.*)"$/, async (name: string) => {
      await createArchetype(authCookie, name);
    });

    when('I search archetypes', async () => {
      response = await request(getApp().getHttpServer())
        .get('/archetypes/search')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the first archetype should have name "(.*)"$/, (name: string) => {
      expect(response.body.data[0].name).toBe(name);
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I search archetypes', async () => {
      response = await request(getApp().getHttpServer())
        .get('/archetypes/search');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- ASSIGN ARCHETYPE IMAGE ---
defineFeature(imageFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdArchetypeId: string;
  const fileIds: Record<string, string> = {};

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    archetypeIds.clear();
    taxonomyIds.clear();
    for (const key of Object.keys(fileIds)) {
      delete fileIds[key];
    }
  });

  afterAll(async () => {
    await teardownApp();
  });

  async function createFile(name: string): Promise<string> {
    const buffer = Buffer.from('fake-image-content');
    const res = await request(getApp().getHttpServer())
      .post('/files/upload')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .attach('file', buffer, { filename: name, contentType: 'image/png' });
    fileIds[name] = res.body.id;
    return res.body.id;
  }

  test('Create archetype with image', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    when(
      /^I create an archetype with image "(.*)" and:$/,
      async (imageName: string, table: { name: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/archetypes')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            imageId: fileIds[imageName],
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include image "(.*)"$/, (name: string) => {
      expect(response.body.image).toBeTruthy();
      expect(response.body.image.originalName).toBe(name);
    });
  });

  test('Create archetype with non-existent image', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I create an archetype with a non-existent image and:$/,
      async (table: { name: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/archetypes')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            imageId: '00000000-0000-0000-0000-000000000000',
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test("Update archetype's image", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    and(
      /^an archetype exists with name "(.*)" and image "(.*)"$/,
      async (name: string, imageName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/archetypes')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, imageId: fileIds[imageName] });
        createdArchetypeId = res.body.id;
      },
    );

    when(/^I update the archetype's image to "(.*)"$/, async (imageName: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/archetypes/${createdArchetypeId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ imageId: fileIds[imageName] });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include image "(.*)"$/, (name: string) => {
      expect(response.body.image).toBeTruthy();
      expect(response.body.image.originalName).toBe(name);
    });
  });

  test("Remove archetype's image", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    and(
      /^an archetype exists with name "(.*)" and image "(.*)"$/,
      async (name: string, imageName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/archetypes')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, imageId: fileIds[imageName] });
        createdArchetypeId = res.body.id;
      },
    );

    when("I update the archetype's image to null", async () => {
      response = await request(getApp().getHttpServer())
        .patch(`/archetypes/${createdArchetypeId}`)
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

  test('Get archetype by ID includes image', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    and(
      /^an archetype exists with name "(.*)" and image "(.*)"$/,
      async (name: string, imageName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/archetypes')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, imageId: fileIds[imageName] });
        createdArchetypeId = res.body.id;
      },
    );

    when('I request the archetype by its ID', async () => {
      response = await request(getApp().getHttpServer())
        .get(`/archetypes/${createdArchetypeId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include image "(.*)"$/, (name: string) => {
      expect(response.body.image).toBeTruthy();
      expect(response.body.image.originalName).toBe(name);
    });
  });

  test('Search archetypes includes image data', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    and(
      /^an archetype exists with name "(.*)" and image "(.*)"$/,
      async (name: string, imageName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/archetypes')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, imageId: fileIds[imageName] });
        createdArchetypeId = res.body.id;
      },
    );

    when('I search archetypes', async () => {
      response = await request(getApp().getHttpServer())
        .get('/archetypes/search')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the first archetype in the list should include image "(.*)"$/, (name: string) => {
      expect(response.body.data.length).toBeGreaterThan(0);
      const arch = response.body.data[0];
      expect(arch.image).toBeTruthy();
      expect(arch.image.originalName).toBe(name);
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I create an archetype without authentication', async () => {
      response = await request(getApp().getHttpServer())
        .post('/archetypes')
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Test' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
