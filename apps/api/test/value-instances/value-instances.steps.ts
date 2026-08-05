import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { bootstrapApp, cleanDatabase, teardownApp, getApp, createAuthenticatedUser } from '../setup';

const createFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/value-instances/create-value-instance.feature'),
);
const listFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/value-instances/list-value-instances.feature'),
);
const getFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/value-instances/get-value-instance.feature'),
);
const updateFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/value-instances/update-value-instance.feature'),
);
const deleteFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/value-instances/delete-value-instance.feature'),
);
const actorsFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/value-instances/assign-value-instance-actors.feature'),
);
const imageFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/value-instances/assign-value-instance-image.feature'),
);
const valueFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/value-instances/assign-value-instance-value.feature'),
);

// --- helpers ---
function makeHelpers() {
  const valueIds: Record<string, string> = {};
  const actorIds: Record<string, string> = {};
  const fileIds: Record<string, string> = {};

  function clear() {
    for (const key of Object.keys(valueIds)) delete valueIds[key];
    for (const key of Object.keys(actorIds)) delete actorIds[key];
    for (const key of Object.keys(fileIds)) delete fileIds[key];
  }

  async function createValue(authCookie: string, name: string, type: string): Promise<string> {
    const res = await request(getApp().getHttpServer())
      .post('/values')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ name, type });
    valueIds[name] = res.body.id;
    return res.body.id;
  }

  async function createActor(authCookie: string, name: string, type: string): Promise<string> {
    const res = await request(getApp().getHttpServer())
      .post('/actors')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ name, type });
    actorIds[name] = res.body.id;
    return res.body.id;
  }

  async function createFile(authCookie: string, name: string): Promise<string> {
    const buffer = Buffer.from('fake-file-content');
    const res = await request(getApp().getHttpServer())
      .post('/files/upload')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .attach('file', buffer, { filename: name, contentType: 'application/octet-stream' });
    fileIds[name] = res.body.id;
    return res.body.id;
  }

  async function createValueInstance(
    authCookie: string,
    name: string,
    valueName: string,
    extra?: Record<string, unknown>,
  ): Promise<string> {
    const res = await request(getApp().getHttpServer())
      .post('/value-instances')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ name, valueId: valueIds[valueName], ...extra });
    return res.body.id;
  }

  return { valueIds, actorIds, fileIds, clear, createValue, createActor, createFile, createValueInstance };
}

// --- CREATE VALUE INSTANCE ---
defineFeature(createFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  const h = makeHelpers();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); h.clear(); });
  afterAll(async () => { await teardownApp(); });

  test('Successfully create a new value instance', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    when(
      'I create a value instance with:',
      async (table: { name: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/value-instances')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, purpose: row.purpose, valueId: h.valueIds['Solar Panel'] });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a value instance with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain a value instance with value "(.*)"$/, (valueName: string) => {
      expect(response.body.value).toBeTruthy();
      expect(response.body.value.name).toBe(valueName);
    });
  });

  test('Creating a value instance without valueId fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create a value instance without valueId with:',
      async (table: { name: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/value-instances')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, purpose: row.purpose });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Creating a value instance with empty name fails', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    when('I create a value instance with empty name', async () => {
      response = await request(getApp().getHttpServer())
        .post('/value-instances')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: '', valueId: h.valueIds['Solar Panel'] });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      'I create a value instance unauthenticated with:',
      async (table: { name: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/value-instances')
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, purpose: row.purpose, valueId: '00000000-0000-0000-0000-000000000000' });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- LIST VALUE INSTANCES ---
defineFeature(listFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  const h = makeHelpers();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); h.clear(); });
  afterAll(async () => { await teardownApp(); });

  test('List value instances with default pagination', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^the following value instances exist for value "(.*)":/,
      async (valueName: string, table: { name: string; purpose: string }[]) => {
        for (const row of table) {
          await h.createValueInstance(authCookie, row.name, valueName, { purpose: row.purpose });
        }
      },
    );

    when('I request the list of value instances', async () => {
      response = await request(getApp().getHttpServer())
        .get('/value-instances')
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

  test('Filter value instances by valueId', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^a value instance exists with name "(.*)" for value "(.*)"$/,
      async (name: string, valueName: string) => {
        await h.createValueInstance(authCookie, name, valueName);
      },
    );

    and(
      /^a value instance exists with name "(.*)" for value "(.*)"$/,
      async (name: string, valueName: string) => {
        await h.createValueInstance(authCookie, name, valueName);
      },
    );

    when(/^I request the list of value instances with valueId for "(.*)"$/, async (valueName: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/value-instances?valueId=${h.valueIds[valueName]}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) value instances?$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(/^all returned value instances should have value "(.*)"$/, (valueName: string) => {
      for (const vi of response.body.data) {
        expect(vi.value.name).toBe(valueName);
      }
    });
  });

  test('Filter value instances by fromActorId', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^an actor exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createActor(authCookie, name, type);
      },
    );

    and(
      /^a value instance exists with name "(.*)" for value "(.*)" with fromActor "(.*)"$/,
      async (name: string, valueName: string, actorName: string) => {
        await h.createValueInstance(authCookie, name, valueName, { fromActorId: h.actorIds[actorName] });
      },
    );

    and(
      /^a value instance exists with name "(.*)" for value "(.*)"$/,
      async (name: string, valueName: string) => {
        await h.createValueInstance(authCookie, name, valueName);
      },
    );

    when(/^I request the list of value instances with fromActorId for "(.*)"$/, async (actorName: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/value-instances?fromActorId=${h.actorIds[actorName]}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) value instances?$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Filter value instances by toActorId', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^an actor exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createActor(authCookie, name, type);
      },
    );

    and(
      /^a value instance exists with name "(.*)" for value "(.*)" with toActor "(.*)"$/,
      async (name: string, valueName: string, actorName: string) => {
        await h.createValueInstance(authCookie, name, valueName, { toActorId: h.actorIds[actorName] });
      },
    );

    and(
      /^a value instance exists with name "(.*)" for value "(.*)"$/,
      async (name: string, valueName: string) => {
        await h.createValueInstance(authCookie, name, valueName);
      },
    );

    when(/^I request the list of value instances with toActorId for "(.*)"$/, async (actorName: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/value-instances?toActorId=${h.actorIds[actorName]}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) value instances?$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Search value instances by name', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^a value instance exists with name "(.*)" for value "(.*)"$/,
      async (name: string, valueName: string) => {
        await h.createValueInstance(authCookie, name, valueName);
      },
    );

    and(
      /^a value instance exists with name "(.*)" for value "(.*)"$/,
      async (name: string, valueName: string) => {
        await h.createValueInstance(authCookie, name, valueName);
      },
    );

    when(/^I request the list of value instances with search "(.*)"$/, async (search: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/value-instances?search=${search}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(
      /^all returned value instances should have "(.*)" in their name or purpose$/,
      (searchTerm: string) => {
        const term = searchTerm.toLowerCase();
        for (const vi of response.body.data) {
          const nameMatch = vi.name.toLowerCase().includes(term);
          const purposeMatch = vi.purpose?.toLowerCase().includes(term) || false;
          expect(nameMatch || purposeMatch).toBe(true);
        }
      },
    );
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I request the list of value instances', async () => {
      response = await request(getApp().getHttpServer()).get('/value-instances');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- GET VALUE INSTANCE ---
defineFeature(getFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdId: string;
  const h = makeHelpers();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); h.clear(); });
  afterAll(async () => { await teardownApp(); });

  test('Get an existing value instance by ID', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^a value instance exists with name "(.*)" for value "(.*)"$/,
      async (name: string, valueName: string) => {
        createdId = await h.createValueInstance(authCookie, name, valueName);
      },
    );

    when('I request the value instance by its ID', async () => {
      response = await request(getApp().getHttpServer())
        .get(`/value-instances/${createdId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a value instance with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Get a non-existent value instance returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I request a value instance with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/value-instances/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I request a value instance with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer()).get(`/value-instances/${id}`);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- UPDATE VALUE INSTANCE ---
defineFeature(updateFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdId: string;
  const h = makeHelpers();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); h.clear(); });
  afterAll(async () => { await teardownApp(); });

  test("Successfully update a value instance's name", ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^a value instance exists with name "(.*)" for value "(.*)"$/,
      async (name: string, valueName: string) => {
        createdId = await h.createValueInstance(authCookie, name, valueName);
      },
    );

    when(/^I update the value instance's name to "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/value-instances/${createdId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a value instance with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Update a non-existent value instance returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I update the value instance with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/value-instances/${id}`)
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
      /^I update the value instance with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/value-instances/${id}`)
          .set('X-CSRF-Protection', '1')
          .send({ name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DELETE VALUE INSTANCE ---
defineFeature(deleteFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdId: string;
  const h = makeHelpers();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); h.clear(); });
  afterAll(async () => { await teardownApp(); });

  test('Successfully delete a value instance', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^a value instance exists with name "(.*)" for value "(.*)"$/,
      async (name: string, valueName: string) => {
        createdId = await h.createValueInstance(authCookie, name, valueName);
      },
    );

    when('I delete the value instance', async () => {
      response = await request(getApp().getHttpServer())
        .delete(`/value-instances/${createdId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Delete a non-existent value instance returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I delete the value instance with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/value-instances/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I delete the value instance with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/value-instances/${id}`)
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- ASSIGN VALUE INSTANCE ACTORS ---
defineFeature(actorsFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdId: string;
  const h = makeHelpers();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); h.clear(); });
  afterAll(async () => { await teardownApp(); });

  test('Create value instance with fromActor', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^an actor exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createActor(authCookie, name, type);
      },
    );

    when(
      /^I create a value instance with fromActor "(.*)" and:$/,
      async (actorName: string, table: { name: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/value-instances')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            purpose: row.purpose,
            valueId: h.valueIds['Solar Panel'],
            fromActorId: h.actorIds[actorName],
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include fromActor "(.*)"$/, (name: string) => {
      expect(response.body.fromActor).toBeTruthy();
      expect(response.body.fromActor.name).toBe(name);
    });
  });

  test('Create value instance with toActor', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^an actor exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createActor(authCookie, name, type);
      },
    );

    when(
      /^I create a value instance with toActor "(.*)" and:$/,
      async (actorName: string, table: { name: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/value-instances')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            purpose: row.purpose,
            valueId: h.valueIds['Solar Panel'],
            toActorId: h.actorIds[actorName],
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include toActor "(.*)"$/, (name: string) => {
      expect(response.body.toActor).toBeTruthy();
      expect(response.body.toActor.name).toBe(name);
    });
  });

  test('Create value instance with both fromActor and toActor', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^an actor exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createActor(authCookie, name, type);
      },
    );

    and(
      /^an actor exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createActor(authCookie, name, type);
      },
    );

    when(
      /^I create a value instance with fromActor "(.*)" and toActor "(.*)" and:$/,
      async (fromName: string, toName: string, table: { name: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/value-instances')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            purpose: row.purpose,
            valueId: h.valueIds['Solar Panel'],
            fromActorId: h.actorIds[fromName],
            toActorId: h.actorIds[toName],
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include fromActor "(.*)"$/, (name: string) => {
      expect(response.body.fromActor).toBeTruthy();
      expect(response.body.fromActor.name).toBe(name);
    });

    and(/^the response should include toActor "(.*)"$/, (name: string) => {
      expect(response.body.toActor).toBeTruthy();
      expect(response.body.toActor.name).toBe(name);
    });
  });

  test("Update value instance's fromActor", ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^an actor exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createActor(authCookie, name, type);
      },
    );

    and(
      /^an actor exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createActor(authCookie, name, type);
      },
    );

    and(
      /^a value instance exists with name "(.*)" for value "(.*)" with fromActor "(.*)"$/,
      async (name: string, valueName: string, actorName: string) => {
        createdId = await h.createValueInstance(authCookie, name, valueName, { fromActorId: h.actorIds[actorName] });
      },
    );

    when(/^I update the value instance's fromActor to "(.*)"$/, async (actorName: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/value-instances/${createdId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ fromActorId: h.actorIds[actorName] });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include fromActor "(.*)"$/, (name: string) => {
      expect(response.body.fromActor).toBeTruthy();
      expect(response.body.fromActor.name).toBe(name);
    });
  });

  test("Remove value instance's fromActor", ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^an actor exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createActor(authCookie, name, type);
      },
    );

    and(
      /^a value instance exists with name "(.*)" for value "(.*)" with fromActor "(.*)"$/,
      async (name: string, valueName: string, actorName: string) => {
        createdId = await h.createValueInstance(authCookie, name, valueName, { fromActorId: h.actorIds[actorName] });
      },
    );

    when("I update the value instance's fromActor to null", async () => {
      response = await request(getApp().getHttpServer())
        .patch(`/value-instances/${createdId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ fromActorId: null });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should have null fromActor', () => {
      expect(response.body.fromActor).toBeNull();
    });
  });

  test('Create value instance with non-existent actor fails', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    when(
      /^I create a value instance with non-existent fromActor and:$/,
      async (table: { name: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/value-instances')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            purpose: row.purpose,
            valueId: h.valueIds['Solar Panel'],
            fromActorId: '00000000-0000-0000-0000-000000000000',
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- ASSIGN VALUE INSTANCE IMAGE ---
defineFeature(imageFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdId: string;
  const h = makeHelpers();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); h.clear(); });
  afterAll(async () => { await teardownApp(); });

  test('Create value instance with image', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await h.createFile(authCookie, name);
    });

    when(
      /^I create a value instance with image "(.*)" and:$/,
      async (imageName: string, table: { name: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/value-instances')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            purpose: row.purpose,
            valueId: h.valueIds['Solar Panel'],
            imageId: h.fileIds[imageName],
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

  test("Update value instance's image", ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await h.createFile(authCookie, name);
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await h.createFile(authCookie, name);
    });

    and(
      /^a value instance exists with name "(.*)" for value "(.*)" with image "(.*)"$/,
      async (name: string, valueName: string, imageName: string) => {
        createdId = await h.createValueInstance(authCookie, name, valueName, { imageId: h.fileIds[imageName] });
      },
    );

    when(/^I update the value instance's image to "(.*)"$/, async (imageName: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/value-instances/${createdId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ imageId: h.fileIds[imageName] });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include image "(.*)"$/, (name: string) => {
      expect(response.body.image).toBeTruthy();
      expect(response.body.image.originalName).toBe(name);
    });
  });

  test("Remove value instance's image", ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await h.createFile(authCookie, name);
    });

    and(
      /^a value instance exists with name "(.*)" for value "(.*)" with image "(.*)"$/,
      async (name: string, valueName: string, imageName: string) => {
        createdId = await h.createValueInstance(authCookie, name, valueName, { imageId: h.fileIds[imageName] });
      },
    );

    when("I update the value instance's image to null", async () => {
      response = await request(getApp().getHttpServer())
        .patch(`/value-instances/${createdId}`)
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

  test('Create value instance with non-existent image fails', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    when(
      /^I create a value instance with non-existent image and:$/,
      async (table: { name: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/value-instances')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            purpose: row.purpose,
            valueId: h.valueIds['Solar Panel'],
            imageId: '00000000-0000-0000-0000-000000000000',
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- ASSIGN VALUE INSTANCE VALUE ---
defineFeature(valueFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdId: string;
  const h = makeHelpers();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); h.clear(); });
  afterAll(async () => { await teardownApp(); });

  test("Update value instance's value", ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^a value instance exists with name "(.*)" for value "(.*)"$/,
      async (name: string, valueName: string) => {
        createdId = await h.createValueInstance(authCookie, name, valueName);
      },
    );

    when(/^I update the value instance's value to "(.*)"$/, async (valueName: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/value-instances/${createdId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ valueId: h.valueIds[valueName] });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a value instance with value "(.*)"$/, (valueName: string) => {
      expect(response.body.value).toBeTruthy();
      expect(response.body.value.name).toBe(valueName);
    });
  });

  test('Update value instance with non-existent value fails', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^a value instance exists with name "(.*)" for value "(.*)"$/,
      async (name: string, valueName: string) => {
        createdId = await h.createValueInstance(authCookie, name, valueName);
      },
    );

    when("I update the value instance's value to a non-existent ID", async () => {
      response = await request(getApp().getHttpServer())
        .patch(`/value-instances/${createdId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ valueId: '00000000-0000-0000-0000-000000000000' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Deleting a value cascades to its instances', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a value exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await h.createValue(authCookie, name, type);
      },
    );

    and(
      /^a value instance exists with name "(.*)" for value "(.*)"$/,
      async (name: string, valueName: string) => {
        createdId = await h.createValueInstance(authCookie, name, valueName);
      },
    );

    when(/^I delete the value "(.*)"$/, async (valueName: string) => {
      await request(getApp().getHttpServer())
        .delete(`/values/${h.valueIds[valueName]}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    and('I request the value instance by its ID', async () => {
      response = await request(getApp().getHttpServer())
        .get(`/value-instances/${createdId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
