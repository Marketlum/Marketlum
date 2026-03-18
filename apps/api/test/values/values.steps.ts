import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { bootstrapApp, cleanDatabase, teardownApp, getApp, createAuthenticatedUser } from '../setup';

const createFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/values/create-value.feature'),
);
const listFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/values/list-values.feature'),
);
const getFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/values/get-value.feature'),
);
const updateFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/values/update-value.feature'),
);
const deleteFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/values/delete-value.feature'),
);
const taxonomyFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/values/assign-value-taxonomies.feature'),
);
const filesFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/values/assign-value-files.feature'),
);
const agentFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/values/assign-value-agent.feature'),
);
const imagesFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/values/assign-value-images.feature'),
);
const parentFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/values/assign-value-parent.feature'),
);
const valueStreamFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/values/assign-value-value-stream.feature'),
);
const abstractFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/values/abstract-value.feature'),
);

// --- CREATE VALUE ---
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

  test('Successfully create a new value', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create a value with:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, type: row.type, purpose: row.purpose });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a value with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain a value with type "(.*)"$/, (type: string) => {
      expect(response.body.type).toBe(type);
    });
  });

  test('Creating a value with invalid data fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create a value with:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/values')
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
      'I create a value with:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/values')
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, type: row.type, purpose: row.purpose });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- LIST VALUES ---
defineFeature(listFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  const taxonomyIds: Record<string, string> = {};
  const agentIds: Record<string, string> = {};

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    for (const key of Object.keys(taxonomyIds)) {
      delete taxonomyIds[key];
    }
    for (const key of Object.keys(agentIds)) {
      delete agentIds[key];
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

  async function createAgent(name: string, type: string): Promise<string> {
    const res = await request(getApp().getHttpServer())
      .post('/agents')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ name, type });
    agentIds[name] = res.body.id;
    return res.body.id;
  }

  test('List values with default pagination', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following values exist:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        for (const row of table) {
          await request(getApp().getHttpServer())
            .post('/values')
            .set('Cookie', [authCookie])
            .set('X-CSRF-Protection', '1')
            .send({ name: row.name, type: row.type, purpose: row.purpose });
        }
      },
    );

    when('I request the list of values', async () => {
      response = await request(getApp().getHttpServer())
        .get('/values')
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

  test('Filter values by type', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following values exist:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        for (const row of table) {
          await request(getApp().getHttpServer())
            .post('/values')
            .set('Cookie', [authCookie])
            .set('X-CSRF-Protection', '1')
            .send({ name: row.name, type: row.type, purpose: row.purpose });
        }
      },
    );

    when(/^I request the list of values with type "(.*)"$/, async (type: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/values?type=${type}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^all returned values should have type "(.*)"$/, (type: string) => {
      for (const value of response.body.data) {
        expect(value.type).toBe(type);
      }
    });
  });

  test('Filter values by agent', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await createAgent(name, type);
      },
    );

    and(
      /^a value exists with name "(.*)" and type "(.*)" and agent "(.*)"$/,
      async (name: string, type: string, agentName: string) => {
        await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, agentId: agentIds[agentName] });
      },
    );

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type });
      },
    );

    when(/^I request the list of values with agentId for "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/values?agentId=${agentIds[name]}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) values?$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(/^all returned values should have agent "(.*)"$/, (name: string) => {
      for (const value of response.body.data) {
        expect(value.agent).toBeTruthy();
        expect(value.agent.name).toBe(name);
      }
    });
  });

  test('Filter values by taxonomy', ({ given, when, then, and }) => {
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
      /^a value exists with name "(.*)" and type "(.*)" and main taxonomy "(.*)"$/,
      async (name: string, type: string, taxonomyName: string) => {
        await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, mainTaxonomyId: taxonomyIds[taxonomyName] });
      },
    );

    and(
      /^a value exists with name "(.*)" and type "(.*)" and main taxonomy "(.*)"$/,
      async (name: string, type: string, taxonomyName: string) => {
        await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, mainTaxonomyId: taxonomyIds[taxonomyName] });
      },
    );

    when(/^I request the list of values with taxonomyId for "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/values?taxonomyId=${taxonomyIds[name]}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) values?$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(/^all returned values should have taxonomy "(.*)"$/, (name: string) => {
      for (const value of response.body.data) {
        const hasMain = value.mainTaxonomy?.name === name;
        const hasGeneral = value.taxonomies?.some((t: { name: string }) => t.name === name);
        expect(hasMain || hasGeneral).toBe(true);
      }
    });
  });

  test('Search values by name', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following values exist:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        for (const row of table) {
          await request(getApp().getHttpServer())
            .post('/values')
            .set('Cookie', [authCookie])
            .set('X-CSRF-Protection', '1')
            .send({ name: row.name, type: row.type, purpose: row.purpose });
        }
      },
    );

    when(/^I request the list of values with search "(.*)"$/, async (search: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/values?search=${search}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(
      /^all returned values should have "(.*)" in their name or purpose$/,
      (searchTerm: string) => {
        const term = searchTerm.toLowerCase();
        for (const value of response.body.data) {
          const nameMatch = value.name.toLowerCase().includes(term);
          const purposeMatch = value.purpose?.toLowerCase().includes(term) || false;
          expect(nameMatch || purposeMatch).toBe(true);
        }
      },
    );
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I request the list of values', async () => {
      response = await request(getApp().getHttpServer()).get('/values');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- GET VALUE ---
defineFeature(getFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdValueId: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Get an existing value by ID', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type });
        createdValueId = res.body.id;
      },
    );

    when('I request the value by its ID', async () => {
      response = await request(getApp().getHttpServer())
        .get(`/values/${createdValueId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a value with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Get a non-existent value returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I request a value with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/values/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I request a value with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer()).get(`/values/${id}`);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- UPDATE VALUE ---
defineFeature(updateFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdValueId: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test("Successfully update a value's name", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type });
        createdValueId = res.body.id;
      },
    );

    when(/^I update the value's name to "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/values/${createdValueId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a value with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Update a non-existent value returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I update the value with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/values/${id}`)
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
      /^I update the value with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/values/${id}`)
          .set('X-CSRF-Protection', '1')
          .send({ name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DELETE VALUE ---
defineFeature(deleteFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdValueId: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Successfully delete a value', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type });
        createdValueId = res.body.id;
      },
    );

    when('I delete the value', async () => {
      response = await request(getApp().getHttpServer())
        .delete(`/values/${createdValueId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Delete a non-existent value returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I delete the value with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/values/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I delete the value with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/values/${id}`)
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- ASSIGN VALUE TAXONOMIES ---
defineFeature(taxonomyFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdValueId: string;
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

  test('Create value with main taxonomy', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    when(
      /^I create a value with main taxonomy "(.*)" and:$/,
      async (taxonomyName: string, table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/values')
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

  test('Create value with general taxonomies', ({ given, when, then, and }) => {
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
      /^I create a value with general taxonomies "(.*)" and:$/,
      async (taxonomyNames: string, table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        const ids = taxonomyNames.split(',').map((n) => taxonomyIds[n.trim()]);
        response = await request(getApp().getHttpServer())
          .post('/values')
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

  test('Create value with both main and general taxonomies', ({ given, when, then, and }) => {
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
      /^I create a value with main taxonomy "(.*)" and general taxonomies "(.*)" and:$/,
      async (mainName: string, generalNames: string, table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        const ids = generalNames.split(',').map((n) => taxonomyIds[n.trim()]);
        response = await request(getApp().getHttpServer())
          .post('/values')
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

  test('Create value with non-existent main taxonomy', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I create a value with a non-existent main taxonomy and:$/,
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/values')
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

  test('Create value with non-existent general taxonomy', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    when(
      /^I create a value with a non-existent general taxonomy and existing "(.*)" and:$/,
      async (existingName: string, table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/values')
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

  test("Update value's main taxonomy", ({ given, when, then, and }) => {
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
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type });
        createdValueId = res.body.id;
      },
    );

    when(/^I update the value's main taxonomy to "(.*)"$/, async (taxonomyName: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/values/${createdValueId}`)
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

  test("Remove value's main taxonomy", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)" and main taxonomy "(.*)"$/,
      async (name: string, type: string, taxonomyName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, mainTaxonomyId: taxonomyIds[taxonomyName] });
        createdValueId = res.body.id;
      },
    );

    when("I update the value's main taxonomy to null", async () => {
      response = await request(getApp().getHttpServer())
        .patch(`/values/${createdValueId}`)
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

  test("Update value's general taxonomies", ({ given, when, then, and }) => {
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
      /^a value exists with name "(.*)" and type "(.*)" and general taxonomies "(.*)"$/,
      async (name: string, type: string, taxonomyNames: string) => {
        const ids = taxonomyNames.split(',').map((n) => taxonomyIds[n.trim()]);
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, taxonomyIds: ids });
        createdValueId = res.body.id;
      },
    );

    when(/^I update the value's general taxonomies to "(.*)"$/, async (taxonomyNames: string) => {
      const ids = taxonomyNames.split(',').map((n) => taxonomyIds[n.trim()]);
      response = await request(getApp().getHttpServer())
        .patch(`/values/${createdValueId}`)
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

  test("Clear value's general taxonomies", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)" and general taxonomies "(.*)"$/,
      async (name: string, type: string, taxonomyNames: string) => {
        const ids = taxonomyNames.split(',').map((n) => taxonomyIds[n.trim()]);
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, taxonomyIds: ids });
        createdValueId = res.body.id;
      },
    );

    when("I update the value's general taxonomies to empty", async () => {
      response = await request(getApp().getHttpServer())
        .patch(`/values/${createdValueId}`)
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

  test('Get value by ID includes taxonomy data', ({ given, when, then, and }) => {
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
      /^a value exists with name "(.*)" and type "(.*)" and main taxonomy "(.*)" and general taxonomies "(.*)"$/,
      async (name: string, type: string, mainName: string, generalNames: string) => {
        const ids = generalNames.split(',').map((n) => taxonomyIds[n.trim()]);
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, mainTaxonomyId: taxonomyIds[mainName], taxonomyIds: ids });
        createdValueId = res.body.id;
      },
    );

    when('I request the value by its ID', async () => {
      response = await request(getApp().getHttpServer())
        .get(`/values/${createdValueId}`)
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

  test('List values includes taxonomy data', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)" and main taxonomy "(.*)"$/,
      async (name: string, type: string, taxonomyName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, mainTaxonomyId: taxonomyIds[taxonomyName] });
        createdValueId = res.body.id;
      },
    );

    when('I request the list of values', async () => {
      response = await request(getApp().getHttpServer())
        .get('/values')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the first value in the list should include main taxonomy "(.*)"$/, (name: string) => {
      expect(response.body.data.length).toBeGreaterThan(0);
      const value = response.body.data[0];
      expect(value.mainTaxonomy).toBeTruthy();
      expect(value.mainTaxonomy.name).toBe(name);
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      'I create a value with:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/values')
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, type: row.type, purpose: row.purpose });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- ASSIGN VALUE FILES ---
defineFeature(filesFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdValueId: string;
  const fileIds: Record<string, string> = {};

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    for (const key of Object.keys(fileIds)) {
      delete fileIds[key];
    }
  });

  afterAll(async () => {
    await teardownApp();
  });

  async function createFile(name: string): Promise<string> {
    const buffer = Buffer.from('fake-file-content');
    const res = await request(getApp().getHttpServer())
      .post('/files/upload')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .attach('file', buffer, { filename: name, contentType: 'application/octet-stream' });
    fileIds[name] = res.body.id;
    return res.body.id;
  }

  test('Create value with files', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    when(
      /^I create a value with files "(.*)" and:$/,
      async (fileNames: string, table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        const ids = fileNames.split(',').map((n) => fileIds[n.trim()]);
        response = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            type: row.type,
            purpose: row.purpose,
            fileIds: ids,
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include files "(.*)"$/, (names: string) => {
      const expected = names.split(',').map((n) => n.trim());
      const actual = response.body.files.map((f: { originalName: string }) => f.originalName).sort();
      expect(actual).toEqual(expected.sort());
    });
  });

  test('Create value with non-existent file', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I create a value with a non-existent file and:$/,
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            type: row.type,
            purpose: row.purpose,
            fileIds: ['00000000-0000-0000-0000-000000000000'],
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test("Update value's files", ({ given, when, then, and }) => {
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
      /^a value exists with name "(.*)" and type "(.*)" and files "(.*)"$/,
      async (name: string, type: string, fileNames: string) => {
        const ids = fileNames.split(',').map((n) => fileIds[n.trim()]);
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, fileIds: ids });
        createdValueId = res.body.id;
      },
    );

    when(/^I update the value's files to "(.*)"$/, async (fileNames: string) => {
      const ids = fileNames.split(',').map((n) => fileIds[n.trim()]);
      response = await request(getApp().getHttpServer())
        .patch(`/values/${createdValueId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ fileIds: ids });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include files "(.*)"$/, (names: string) => {
      const expected = names.split(',').map((n) => n.trim());
      const actual = response.body.files.map((f: { originalName: string }) => f.originalName).sort();
      expect(actual).toEqual(expected.sort());
    });
  });

  test("Remove value's files", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)" and files "(.*)"$/,
      async (name: string, type: string, fileNames: string) => {
        const ids = fileNames.split(',').map((n) => fileIds[n.trim()]);
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, fileIds: ids });
        createdValueId = res.body.id;
      },
    );

    when("I update the value's files to empty", async () => {
      response = await request(getApp().getHttpServer())
        .patch(`/values/${createdValueId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ fileIds: [] });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should have empty files', () => {
      expect(response.body.files).toEqual([]);
    });
  });

  test('Get value by ID includes files', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)" and files "(.*)"$/,
      async (name: string, type: string, fileNames: string) => {
        const ids = fileNames.split(',').map((n) => fileIds[n.trim()]);
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, fileIds: ids });
        createdValueId = res.body.id;
      },
    );

    when('I request the value by its ID', async () => {
      response = await request(getApp().getHttpServer())
        .get(`/values/${createdValueId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include files "(.*)"$/, (names: string) => {
      const expected = names.split(',').map((n) => n.trim());
      const actual = response.body.files.map((f: { originalName: string }) => f.originalName).sort();
      expect(actual).toEqual(expected.sort());
    });
  });

  test('List values includes file data', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)" and files "(.*)"$/,
      async (name: string, type: string, fileNames: string) => {
        const ids = fileNames.split(',').map((n) => fileIds[n.trim()]);
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, fileIds: ids });
        createdValueId = res.body.id;
      },
    );

    when('I request the list of values', async () => {
      response = await request(getApp().getHttpServer())
        .get('/values')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the first value in the list should include files "(.*)"$/, (names: string) => {
      expect(response.body.data.length).toBeGreaterThan(0);
      const expected = names.split(',').map((n) => n.trim());
      const actual = response.body.data[0].files.map((f: { originalName: string }) => f.originalName).sort();
      expect(actual).toEqual(expected.sort());
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      'I create a value with:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/values')
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, type: row.type, purpose: row.purpose });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- ASSIGN VALUE IMAGES ---
defineFeature(imagesFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdValueId: string;
  const fileIds: Record<string, string> = {};

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    for (const key of Object.keys(fileIds)) {
      delete fileIds[key];
    }
  });

  afterAll(async () => {
    await teardownApp();
  });

  async function createFile(name: string): Promise<string> {
    const buffer = Buffer.from('fake-file-content');
    const res = await request(getApp().getHttpServer())
      .post('/files/upload')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .attach('file', buffer, { filename: name, contentType: 'application/octet-stream' });
    fileIds[name] = res.body.id;
    return res.body.id;
  }

  test('Create value with images', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    when(
      /^I create a value with images "(.*)" and:$/,
      async (imageNames: string, table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        const ids = imageNames.split(',').map((n) => fileIds[n.trim()]);
        response = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            type: row.type,
            purpose: row.purpose,
            imageIds: ids,
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include images "(.*)" in order$/, (names: string) => {
      const expected = names.split(',').map((n) => n.trim());
      const actual = response.body.images.map((img: { originalName: string }) => img.originalName);
      expect(actual).toEqual(expected);
    });
  });

  test('Create value with non-existent image', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I create a value with a non-existent image and:$/,
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            type: row.type,
            purpose: row.purpose,
            imageIds: ['00000000-0000-0000-0000-000000000000'],
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test("Update value's images", ({ given, when, then, and }) => {
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
      /^a value exists with name "(.*)" and type "(.*)" and images "(.*)"$/,
      async (name: string, type: string, imageNames: string) => {
        const ids = imageNames.split(',').map((n) => fileIds[n.trim()]);
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, imageIds: ids });
        createdValueId = res.body.id;
      },
    );

    when(/^I update the value's images to "(.*)"$/, async (imageNames: string) => {
      const ids = imageNames.split(',').map((n) => fileIds[n.trim()]);
      response = await request(getApp().getHttpServer())
        .patch(`/values/${createdValueId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ imageIds: ids });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include images "(.*)" in order$/, (names: string) => {
      const expected = names.split(',').map((n) => n.trim());
      const actual = response.body.images.map((img: { originalName: string }) => img.originalName);
      expect(actual).toEqual(expected);
    });
  });

  test("Remove value's images", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)" and images "(.*)"$/,
      async (name: string, type: string, imageNames: string) => {
        const ids = imageNames.split(',').map((n) => fileIds[n.trim()]);
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, imageIds: ids });
        createdValueId = res.body.id;
      },
    );

    when("I update the value's images to empty", async () => {
      response = await request(getApp().getHttpServer())
        .patch(`/values/${createdValueId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ imageIds: [] });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should have empty images', () => {
      expect(response.body.images).toEqual([]);
    });
  });

  test('Get value by ID includes images', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)" and images "(.*)"$/,
      async (name: string, type: string, imageNames: string) => {
        const ids = imageNames.split(',').map((n) => fileIds[n.trim()]);
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, imageIds: ids });
        createdValueId = res.body.id;
      },
    );

    when('I request the value by its ID', async () => {
      response = await request(getApp().getHttpServer())
        .get(`/values/${createdValueId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include images "(.*)" in order$/, (names: string) => {
      const expected = names.split(',').map((n) => n.trim());
      const actual = response.body.images.map((img: { originalName: string }) => img.originalName);
      expect(actual).toEqual(expected);
    });
  });

  test('List values includes image data', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)" and images "(.*)"$/,
      async (name: string, type: string, imageNames: string) => {
        const ids = imageNames.split(',').map((n) => fileIds[n.trim()]);
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, imageIds: ids });
        createdValueId = res.body.id;
      },
    );

    when('I request the list of values', async () => {
      response = await request(getApp().getHttpServer())
        .get('/values')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the first value in the list should include images "(.*)" in order$/, (names: string) => {
      expect(response.body.data.length).toBeGreaterThan(0);
      const expected = names.split(',').map((n) => n.trim());
      const actual = response.body.data[0].images.map((img: { originalName: string }) => img.originalName);
      expect(actual).toEqual(expected);
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      'I create a value with:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/values')
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, type: row.type, purpose: row.purpose });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- ASSIGN VALUE AGENT ---
defineFeature(agentFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdValueId: string;
  const agentIds: Record<string, string> = {};

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    for (const key of Object.keys(agentIds)) {
      delete agentIds[key];
    }
  });

  afterAll(async () => {
    await teardownApp();
  });

  async function createAgent(name: string, type: string): Promise<string> {
    const res = await request(getApp().getHttpServer())
      .post('/agents')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ name, type });
    agentIds[name] = res.body.id;
    return res.body.id;
  }

  test('Create value with agent', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await createAgent(name, type);
      },
    );

    when(
      /^I create a value with agent "(.*)" and:$/,
      async (agentName: string, table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            type: row.type,
            purpose: row.purpose,
            agentId: agentIds[agentName],
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include agent "(.*)"$/, (name: string) => {
      expect(response.body.agent).toBeTruthy();
      expect(response.body.agent.name).toBe(name);
    });
  });

  test('Create value with non-existent agent', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I create a value with a non-existent agent and:$/,
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            type: row.type,
            purpose: row.purpose,
            agentId: '00000000-0000-0000-0000-000000000000',
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test("Update value's agent", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await createAgent(name, type);
      },
    );

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await createAgent(name, type);
      },
    );

    and(
      /^a value exists with name "(.*)" and type "(.*)" and agent "(.*)"$/,
      async (name: string, type: string, agentName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, agentId: agentIds[agentName] });
        createdValueId = res.body.id;
      },
    );

    when(/^I update the value's agent to "(.*)"$/, async (agentName: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/values/${createdValueId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ agentId: agentIds[agentName] });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include agent "(.*)"$/, (name: string) => {
      expect(response.body.agent).toBeTruthy();
      expect(response.body.agent.name).toBe(name);
    });
  });

  test("Remove value's agent", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await createAgent(name, type);
      },
    );

    and(
      /^a value exists with name "(.*)" and type "(.*)" and agent "(.*)"$/,
      async (name: string, type: string, agentName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, agentId: agentIds[agentName] });
        createdValueId = res.body.id;
      },
    );

    when("I update the value's agent to null", async () => {
      response = await request(getApp().getHttpServer())
        .patch(`/values/${createdValueId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ agentId: null });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should have null agent', () => {
      expect(response.body.agent).toBeNull();
    });
  });

  test('Get value by ID includes agent', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await createAgent(name, type);
      },
    );

    and(
      /^a value exists with name "(.*)" and type "(.*)" and agent "(.*)"$/,
      async (name: string, type: string, agentName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, agentId: agentIds[agentName] });
        createdValueId = res.body.id;
      },
    );

    when('I request the value by its ID', async () => {
      response = await request(getApp().getHttpServer())
        .get(`/values/${createdValueId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include agent "(.*)"$/, (name: string) => {
      expect(response.body.agent).toBeTruthy();
      expect(response.body.agent.name).toBe(name);
    });
  });

  test('List values includes agent data', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^an agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await createAgent(name, type);
      },
    );

    and(
      /^a value exists with name "(.*)" and type "(.*)" and agent "(.*)"$/,
      async (name: string, type: string, agentName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, agentId: agentIds[agentName] });
        createdValueId = res.body.id;
      },
    );

    when('I request the list of values', async () => {
      response = await request(getApp().getHttpServer())
        .get('/values')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the first value in the list should include agent "(.*)"$/, (name: string) => {
      expect(response.body.data.length).toBeGreaterThan(0);
      const value = response.body.data[0];
      expect(value.agent).toBeTruthy();
      expect(value.agent.name).toBe(name);
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      'I create a value with:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/values')
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, type: row.type, purpose: row.purpose });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- ASSIGN VALUE PARENT ---
defineFeature(parentFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdValueId: string;
  const valueIds: Record<string, string> = {};

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    for (const key of Object.keys(valueIds)) {
      delete valueIds[key];
    }
  });

  afterAll(async () => {
    await teardownApp();
  });

  async function createValue(name: string, type: string, extra?: Record<string, unknown>): Promise<string> {
    const res = await request(getApp().getHttpServer())
      .post('/values')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ name, type, ...extra });
    valueIds[name] = res.body.id;
    return res.body.id;
  }

  test('Create value with parent', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await createValue(name, type);
      },
    );

    when(
      /^I create a value with parent "(.*)" and parentType "(.*)" and:$/,
      async (parentName: string, parentType: string, table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            type: row.type,
            purpose: row.purpose,
            parentId: valueIds[parentName],
            parentType,
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include parent "(.*)"$/, (name: string) => {
      expect(response.body.parent).toBeTruthy();
      expect(response.body.parent.name).toBe(name);
    });

    and(/^the response should include parentType "(.*)"$/, (parentType: string) => {
      expect(response.body.parentType).toBe(parentType);
    });
  });

  test('Create value with non-existent parent', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I create a value with a non-existent parent and:$/,
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            type: row.type,
            purpose: row.purpose,
            parentId: '00000000-0000-0000-0000-000000000000',
            parentType: 'on_top_of',
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test("Update value's parent", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await createValue(name, type);
      },
    );

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await createValue(name, type);
      },
    );

    and(
      /^a value exists with name "(.*)" and type "(.*)" and parent "(.*)" and parentType "(.*)"$/,
      async (name: string, type: string, parentName: string, parentType: string) => {
        createdValueId = await createValue(name, type, { parentId: valueIds[parentName], parentType });
      },
    );

    when(
      /^I update the value's parent to "(.*)" with parentType "(.*)"$/,
      async (parentName: string, parentType: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/values/${createdValueId}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ parentId: valueIds[parentName], parentType });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include parent "(.*)"$/, (name: string) => {
      expect(response.body.parent).toBeTruthy();
      expect(response.body.parent.name).toBe(name);
    });

    and(/^the response should include parentType "(.*)"$/, (parentType: string) => {
      expect(response.body.parentType).toBe(parentType);
    });
  });

  test("Remove value's parent", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await createValue(name, type);
      },
    );

    and(
      /^a value exists with name "(.*)" and type "(.*)" and parent "(.*)" and parentType "(.*)"$/,
      async (name: string, type: string, parentName: string, parentType: string) => {
        createdValueId = await createValue(name, type, { parentId: valueIds[parentName], parentType });
      },
    );

    when("I update the value's parent to null", async () => {
      response = await request(getApp().getHttpServer())
        .patch(`/values/${createdValueId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ parentId: null });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should have null parent', () => {
      expect(response.body.parent).toBeNull();
    });
  });

  test('Get value by ID includes parent', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await createValue(name, type);
      },
    );

    and(
      /^a value exists with name "(.*)" and type "(.*)" and parent "(.*)" and parentType "(.*)"$/,
      async (name: string, type: string, parentName: string, parentType: string) => {
        createdValueId = await createValue(name, type, { parentId: valueIds[parentName], parentType });
      },
    );

    when('I request the value by its ID', async () => {
      response = await request(getApp().getHttpServer())
        .get(`/values/${createdValueId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include parent "(.*)"$/, (name: string) => {
      expect(response.body.parent).toBeTruthy();
      expect(response.body.parent.name).toBe(name);
    });

    and(/^the response should include parentType "(.*)"$/, (parentType: string) => {
      expect(response.body.parentType).toBe(parentType);
    });
  });

  test('List values includes parent data', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await createValue(name, type);
      },
    );

    and(
      /^a value exists with name "(.*)" and type "(.*)" and parent "(.*)" and parentType "(.*)"$/,
      async (name: string, type: string, parentName: string, parentType: string) => {
        createdValueId = await createValue(name, type, { parentId: valueIds[parentName], parentType });
      },
    );

    when('I request the list of values', async () => {
      response = await request(getApp().getHttpServer())
        .get('/values')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^at least one value in the list should include parent "(.*)"$/, (name: string) => {
      const found = response.body.data.some(
        (v: { parent?: { name: string } }) => v.parent?.name === name,
      );
      expect(found).toBe(true);
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      'I create a value with:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/values')
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, type: row.type, purpose: row.purpose });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- ASSIGN VALUE VALUE STREAM ---
defineFeature(valueStreamFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdValueId: string;
  const valueStreamIds: Record<string, string> = {};

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    for (const key of Object.keys(valueStreamIds)) {
      delete valueStreamIds[key];
    }
  });

  afterAll(async () => {
    await teardownApp();
  });

  async function createValueStream(name: string): Promise<string> {
    const res = await request(getApp().getHttpServer())
      .post('/value-streams')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ name });
    valueStreamIds[name] = res.body.id;
    return res.body.id;
  }

  test('Create value with value stream', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a value stream exists with name "(.*)"$/, async (name: string) => {
      await createValueStream(name);
    });

    when(
      /^I create a value with value stream "(.*)" and:$/,
      async (vsName: string, table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            type: row.type,
            purpose: row.purpose,
            valueStreamId: valueStreamIds[vsName],
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include value stream "(.*)"$/, (name: string) => {
      expect(response.body.valueStream).toBeTruthy();
      expect(response.body.valueStream.name).toBe(name);
    });
  });

  test('Create value with non-existent value stream', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I create a value with a non-existent value stream and:$/,
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            type: row.type,
            purpose: row.purpose,
            valueStreamId: '00000000-0000-0000-0000-000000000000',
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test("Update value's value stream", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a value stream exists with name "(.*)"$/, async (name: string) => {
      await createValueStream(name);
    });

    and(/^a value stream exists with name "(.*)"$/, async (name: string) => {
      await createValueStream(name);
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)" and value stream "(.*)"$/,
      async (name: string, type: string, vsName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, valueStreamId: valueStreamIds[vsName] });
        createdValueId = res.body.id;
      },
    );

    when(/^I update the value's value stream to "(.*)"$/, async (vsName: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/values/${createdValueId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ valueStreamId: valueStreamIds[vsName] });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include value stream "(.*)"$/, (name: string) => {
      expect(response.body.valueStream).toBeTruthy();
      expect(response.body.valueStream.name).toBe(name);
    });
  });

  test("Remove value's value stream", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a value stream exists with name "(.*)"$/, async (name: string) => {
      await createValueStream(name);
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)" and value stream "(.*)"$/,
      async (name: string, type: string, vsName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, valueStreamId: valueStreamIds[vsName] });
        createdValueId = res.body.id;
      },
    );

    when("I update the value's value stream to null", async () => {
      response = await request(getApp().getHttpServer())
        .patch(`/values/${createdValueId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ valueStreamId: null });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should have null value stream', () => {
      expect(response.body.valueStream).toBeNull();
    });
  });

  test('List values includes value stream data', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a value stream exists with name "(.*)"$/, async (name: string) => {
      await createValueStream(name);
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)" and value stream "(.*)"$/,
      async (name: string, type: string, vsName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, valueStreamId: valueStreamIds[vsName] });
        createdValueId = res.body.id;
      },
    );

    when('I request the list of values', async () => {
      response = await request(getApp().getHttpServer())
        .get('/values')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the first value in the list should include value stream "(.*)"$/, (name: string) => {
      expect(response.body.data.length).toBeGreaterThan(0);
      const value = response.body.data[0];
      expect(value.valueStream).toBeTruthy();
      expect(value.valueStream.name).toBe(name);
    });
  });
});

// --- ABSTRACT VALUE ---
defineFeature(abstractFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let valueId: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Create a value marked as abstract', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create a value with:',
      async (table: { name: string; type: string; abstract: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, type: row.type, abstract: row.abstract === 'true' });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a value with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should have abstract set to (.*)$/, (val: string) => {
      expect(response.body.abstract).toBe(val === 'true');
    });
  });

  test('Create a value defaults to non-abstract', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create a value with:',
      async (table: { name: string; type: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, type: row.type });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should have abstract set to (.*)$/, (val: string) => {
      expect(response.body.abstract).toBe(val === 'true');
    });
  });

  test('Update a value to be abstract', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type });
        valueId = res.body.id;
      },
    );

    when("I update the value's abstract flag to true", async () => {
      response = await request(getApp().getHttpServer())
        .patch(`/values/${valueId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ abstract: true });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should have abstract set to (.*)$/, (val: string) => {
      expect(response.body.abstract).toBe(val === 'true');
    });
  });

  test('Update a value to not be abstract', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^an abstract value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/values')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, abstract: true });
        valueId = res.body.id;
      },
    );

    when("I update the value's abstract flag to false", async () => {
      response = await request(getApp().getHttpServer())
        .patch(`/values/${valueId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ abstract: false });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should have abstract set to (.*)$/, (val: string) => {
      expect(response.body.abstract).toBe(val === 'true');
    });
  });
});
