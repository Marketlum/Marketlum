import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { bootstrapApp, cleanDatabase, teardownApp, getApp, createAuthenticatedUser } from '../setup';
import { expectEventWithId } from '../events/event-steps';

const createFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/actors/create-actor.feature'),
);
const listFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/actors/list-actors.feature'),
);
const getFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/actors/get-actor.feature'),
);
const updateFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/actors/update-actor.feature'),
);
const deleteFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/actors/delete-actor.feature'),
);
const taxonomyFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/actors/assign-actor-taxonomies.feature'),
);
const imageFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/actors/assign-actor-image.feature'),
);
const detailsFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/actors/get-actor-details.feature'),
);
const eventsFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/actors/actor-events.feature'),
);

// --- CREATE ACTOR ---
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

  test('Successfully create a new actor', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create an actor with:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, type: row.type, purpose: row.purpose });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an actor with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain an actor with type "(.*)"$/, (type: string) => {
      expect(response.body.type).toBe(type);
    });
  });

  test('Creating an actor with invalid data fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create an actor with:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/actors')
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
      'I create an actor with:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/actors')
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, type: row.type, purpose: row.purpose });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- LIST ACTORS ---
defineFeature(listFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
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

  test('List actors with default pagination', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following actors exist:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        for (const row of table) {
          await request(getApp().getHttpServer())
            .post('/actors')
            .set('Cookie', [authCookie])
            .set('X-CSRF-Protection', '1')
            .send({ name: row.name, type: row.type, purpose: row.purpose });
        }
      },
    );

    when('I request the list of actors', async () => {
      response = await request(getApp().getHttpServer())
        .get('/actors')
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

  test('Filter actors by type', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following actors exist:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        for (const row of table) {
          await request(getApp().getHttpServer())
            .post('/actors')
            .set('Cookie', [authCookie])
            .set('X-CSRF-Protection', '1')
            .send({ name: row.name, type: row.type, purpose: row.purpose });
        }
      },
    );

    when(/^I request the list of actors with type "(.*)"$/, async (type: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/actors?type=${type}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^all returned actors should have type "(.*)"$/, (type: string) => {
      for (const actor of response.body.data) {
        expect(actor.type).toBe(type);
      }
    });
  });

  test('Search actors by name', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following actors exist:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        for (const row of table) {
          await request(getApp().getHttpServer())
            .post('/actors')
            .set('Cookie', [authCookie])
            .set('X-CSRF-Protection', '1')
            .send({ name: row.name, type: row.type, purpose: row.purpose });
        }
      },
    );

    when(/^I request the list of actors with search "(.*)"$/, async (search: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/actors?search=${search}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(
      /^all returned actors should have "(.*)" in their name or purpose$/,
      (searchTerm: string) => {
        const term = searchTerm.toLowerCase();
        for (const actor of response.body.data) {
          const nameMatch = actor.name.toLowerCase().includes(term);
          const purposeMatch = actor.purpose?.toLowerCase().includes(term) || false;
          expect(nameMatch || purposeMatch).toBe(true);
        }
      },
    );
  });

  test('Filter by taxonomy matching main taxonomy', ({ given, when, then, and }) => {
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
      /^an actor exists with name "(.*)" and type "(.*)" and main taxonomy "(.*)"$/,
      async (name: string, type: string, taxonomyName: string) => {
        await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, mainTaxonomyId: taxonomyIds[taxonomyName] });
      },
    );

    and(
      /^an actor exists with name "(.*)" and type "(.*)" and main taxonomy "(.*)"$/,
      async (name: string, type: string, taxonomyName: string) => {
        await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, mainTaxonomyId: taxonomyIds[taxonomyName] });
      },
    );

    when(/^I request the list of actors with taxonomyId for "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/actors?taxonomyId=${taxonomyIds[name]}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) actors?$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(/^all returned actors should have taxonomy "(.*)"$/, (name: string) => {
      for (const actor of response.body.data) {
        const hasMain = actor.mainTaxonomy?.name === name;
        const hasGeneral = actor.taxonomies?.some((t: { name: string }) => t.name === name);
        expect(hasMain || hasGeneral).toBe(true);
      }
    });
  });

  test('Filter by taxonomy matching general taxonomies', ({ given, when, then, and }) => {
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
      /^an actor exists with name "(.*)" and type "(.*)" and general taxonomies "(.*)"$/,
      async (name: string, type: string, taxonomyNames: string) => {
        const ids = taxonomyNames.split(',').map((n) => taxonomyIds[n.trim()]);
        await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, taxonomyIds: ids });
      },
    );

    and(
      /^an actor exists with name "(.*)" and type "(.*)" and general taxonomies "(.*)"$/,
      async (name: string, type: string, taxonomyNames: string) => {
        const ids = taxonomyNames.split(',').map((n) => taxonomyIds[n.trim()]);
        await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, taxonomyIds: ids });
      },
    );

    when(/^I request the list of actors with taxonomyId for "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/actors?taxonomyId=${taxonomyIds[name]}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) actors?$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(/^all returned actors should have taxonomy "(.*)"$/, (name: string) => {
      for (const actor of response.body.data) {
        const hasMain = actor.mainTaxonomy?.name === name;
        const hasGeneral = actor.taxonomies?.some((t: { name: string }) => t.name === name);
        expect(hasMain || hasGeneral).toBe(true);
      }
    });
  });

  test('Filter matches both main and general taxonomies', ({ given, when, then, and }) => {
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
      /^an actor exists with name "(.*)" and type "(.*)" and main taxonomy "(.*)"$/,
      async (name: string, type: string, taxonomyName: string) => {
        await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, mainTaxonomyId: taxonomyIds[taxonomyName] });
      },
    );

    and(
      /^an actor exists with name "(.*)" and type "(.*)" and general taxonomies "(.*)"$/,
      async (name: string, type: string, taxonomyNames: string) => {
        const ids = taxonomyNames.split(',').map((n) => taxonomyIds[n.trim()]);
        await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, taxonomyIds: ids });
      },
    );

    and(
      /^an actor exists with name "(.*)" and type "(.*)" and main taxonomy "(.*)"$/,
      async (name: string, type: string, taxonomyName: string) => {
        await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, mainTaxonomyId: taxonomyIds[taxonomyName] });
      },
    );

    when(/^I request the list of actors with taxonomyId for "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/actors?taxonomyId=${taxonomyIds[name]}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) actors?$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(/^all returned actors should have taxonomy "(.*)"$/, (name: string) => {
      for (const actor of response.body.data) {
        const hasMain = actor.mainTaxonomy?.name === name;
        const hasGeneral = actor.taxonomies?.some((t: { name: string }) => t.name === name);
        expect(hasMain || hasGeneral).toBe(true);
      }
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I request the list of actors', async () => {
      response = await request(getApp().getHttpServer()).get('/actors');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- GET ACTOR ---
defineFeature(getFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdActorId: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Get an existing actor by ID', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^an actor exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type });
        createdActorId = res.body.id;
      },
    );

    when('I request the actor by their ID', async () => {
      response = await request(getApp().getHttpServer())
        .get(`/actors/${createdActorId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an actor with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Get a non-existent actor returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I request an actor with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/actors/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I request an actor with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer()).get(`/actors/${id}`);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- UPDATE ACTOR ---
defineFeature(updateFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdActorId: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test("Successfully update an actor's name", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^an actor exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type });
        createdActorId = res.body.id;
      },
    );

    when(/^I update the actor's name to "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/actors/${createdActorId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an actor with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Update a non-existent actor returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I update the actor with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/actors/${id}`)
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
      /^I update the actor with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/actors/${id}`)
          .set('X-CSRF-Protection', '1')
          .send({ name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DELETE ACTOR ---
defineFeature(deleteFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdActorId: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Successfully delete an actor', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^an actor exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type });
        createdActorId = res.body.id;
      },
    );

    when('I delete the actor', async () => {
      response = await request(getApp().getHttpServer())
        .delete(`/actors/${createdActorId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Delete a non-existent actor returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I delete the actor with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/actors/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I delete the actor with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/actors/${id}`)
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- ASSIGN ACTOR TAXONOMIES ---
defineFeature(taxonomyFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdActorId: string;
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

  test('Create actor with main taxonomy', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    when(
      /^I create an actor with main taxonomy "(.*)" and:$/,
      async (taxonomyName: string, table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/actors')
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

  test('Create actor with general taxonomies', ({ given, when, then, and }) => {
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
      /^I create an actor with general taxonomies "(.*)" and:$/,
      async (taxonomyNames: string, table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        const ids = taxonomyNames.split(',').map((n) => taxonomyIds[n.trim()]);
        response = await request(getApp().getHttpServer())
          .post('/actors')
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

  test('Create actor with both main and general taxonomies', ({ given, when, then, and }) => {
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
      /^I create an actor with main taxonomy "(.*)" and general taxonomies "(.*)" and:$/,
      async (mainName: string, generalNames: string, table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        const ids = generalNames.split(',').map((n) => taxonomyIds[n.trim()]);
        response = await request(getApp().getHttpServer())
          .post('/actors')
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

  test('Create actor with non-existent main taxonomy', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I create an actor with a non-existent main taxonomy and:$/,
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/actors')
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

  test('Create actor with non-existent general taxonomy', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    when(
      /^I create an actor with a non-existent general taxonomy and existing "(.*)" and:$/,
      async (existingName: string, table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/actors')
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

  test("Update actor's main taxonomy", ({ given, when, then, and }) => {
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
      /^an actor exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type });
        createdActorId = res.body.id;
      },
    );

    when(/^I update the actor's main taxonomy to "(.*)"$/, async (taxonomyName: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/actors/${createdActorId}`)
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

  test("Remove actor's main taxonomy", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    and(
      /^an actor exists with name "(.*)" and type "(.*)" and main taxonomy "(.*)"$/,
      async (name: string, type: string, taxonomyName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, mainTaxonomyId: taxonomyIds[taxonomyName] });
        createdActorId = res.body.id;
      },
    );

    when("I update the actor's main taxonomy to null", async () => {
      response = await request(getApp().getHttpServer())
        .patch(`/actors/${createdActorId}`)
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

  test("Update actor's general taxonomies", ({ given, when, then, and }) => {
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
      /^an actor exists with name "(.*)" and type "(.*)" and general taxonomies "(.*)"$/,
      async (name: string, type: string, taxonomyNames: string) => {
        const ids = taxonomyNames.split(',').map((n) => taxonomyIds[n.trim()]);
        const res = await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, taxonomyIds: ids });
        createdActorId = res.body.id;
      },
    );

    when(/^I update the actor's general taxonomies to "(.*)"$/, async (taxonomyNames: string) => {
      const ids = taxonomyNames.split(',').map((n) => taxonomyIds[n.trim()]);
      response = await request(getApp().getHttpServer())
        .patch(`/actors/${createdActorId}`)
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

  test("Clear actor's general taxonomies", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    and(
      /^an actor exists with name "(.*)" and type "(.*)" and general taxonomies "(.*)"$/,
      async (name: string, type: string, taxonomyNames: string) => {
        const ids = taxonomyNames.split(',').map((n) => taxonomyIds[n.trim()]);
        const res = await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, taxonomyIds: ids });
        createdActorId = res.body.id;
      },
    );

    when("I update the actor's general taxonomies to empty", async () => {
      response = await request(getApp().getHttpServer())
        .patch(`/actors/${createdActorId}`)
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

  test('Get actor by ID includes taxonomy data', ({ given, when, then, and }) => {
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
      /^an actor exists with name "(.*)" and type "(.*)" and main taxonomy "(.*)" and general taxonomies "(.*)"$/,
      async (name: string, type: string, mainName: string, generalNames: string) => {
        const ids = generalNames.split(',').map((n) => taxonomyIds[n.trim()]);
        const res = await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, mainTaxonomyId: taxonomyIds[mainName], taxonomyIds: ids });
        createdActorId = res.body.id;
      },
    );

    when('I request the actor by their ID', async () => {
      response = await request(getApp().getHttpServer())
        .get(`/actors/${createdActorId}`)
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

  test('List actors includes taxonomy data', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a taxonomy exists with name "(.*)"$/, async (name: string) => {
      await createTaxonomy(name);
    });

    and(
      /^an actor exists with name "(.*)" and type "(.*)" and main taxonomy "(.*)"$/,
      async (name: string, type: string, taxonomyName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, mainTaxonomyId: taxonomyIds[taxonomyName] });
        createdActorId = res.body.id;
      },
    );

    when('I request the list of actors', async () => {
      response = await request(getApp().getHttpServer())
        .get('/actors')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the first actor in the list should include main taxonomy "(.*)"$/, (name: string) => {
      expect(response.body.data.length).toBeGreaterThan(0);
      const actor = response.body.data[0];
      expect(actor.mainTaxonomy).toBeTruthy();
      expect(actor.mainTaxonomy.name).toBe(name);
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      'I create an actor with:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/actors')
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, type: row.type, purpose: row.purpose });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- GET ACTOR DETAILS ---
defineFeature(detailsFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdActorId: string;
  const fileIds: Record<string, string> = {};
  const taxonomyIds: Record<string, string> = {};

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    for (const key of Object.keys(fileIds)) {
      delete fileIds[key];
    }
    for (const key of Object.keys(taxonomyIds)) {
      delete taxonomyIds[key];
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

  async function createTaxonomy(name: string): Promise<string> {
    const res = await request(getApp().getHttpServer())
      .post('/taxonomies')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ name });
    taxonomyIds[name] = res.body.id;
    return res.body.id;
  }

  test('Get actor with all fields populated', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
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
      /^an actor exists with name "(.*)" and type "(.*)" and purpose "(.*)" and image "(.*)" and main taxonomy "(.*)" and general taxonomies "(.*)"$/,
      async (name: string, type: string, purpose: string, imageName: string, mainTaxName: string, generalNames: string) => {
        const ids = generalNames.split(',').map((n) => taxonomyIds[n.trim()]);
        const res = await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name,
            type,
            purpose,
            imageId: fileIds[imageName],
            mainTaxonomyId: taxonomyIds[mainTaxName],
            taxonomyIds: ids,
          });
        createdActorId = res.body.id;
      },
    );

    when('I request the actor details by their ID', async () => {
      response = await request(getApp().getHttpServer())
        .get(`/actors/${createdActorId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should contain id', () => {
      expect(response.body.id).toBeDefined();
      expect(response.body.id).toBe(createdActorId);
    });

    and(/^the response should contain name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain type "(.*)"$/, (type: string) => {
      expect(response.body.type).toBe(type);
    });

    and(/^the response should contain purpose "(.*)"$/, (purpose: string) => {
      expect(response.body.purpose).toBe(purpose);
    });

    and(/^the response should include image "(.*)"$/, (name: string) => {
      expect(response.body.image).toBeTruthy();
      expect(response.body.image.originalName).toBe(name);
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

    and('the response should contain createdAt', () => {
      expect(response.body.createdAt).toBeDefined();
    });

    and('the response should contain updatedAt', () => {
      expect(response.body.updatedAt).toBeDefined();
    });
  });

  test('Get actor details with ancestors', ({ given, when, then, and }) => {
    const hierarchyIds = new Map<string, string>();

    async function createHierarchyActor(
      name: string,
      type: string,
      parentName?: string,
    ): Promise<void> {
      const body: Record<string, unknown> = { name, type };
      if (parentName) body.parentId = hierarchyIds.get(parentName);
      const res = await request(getApp().getHttpServer())
        .post('/actors')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send(body);
      expect(res.status).toBe(201);
      hierarchyIds.set(name, res.body.id);
    }

    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
      hierarchyIds.clear();
    });

    and(
      /^a root actor exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await createHierarchyActor(name, type);
      },
    );

    and(
      /^an actor exists with name "(.*)" and type "(.*)" under parent "(.*)"$/,
      async (name: string, type: string, parentName: string) => {
        await createHierarchyActor(name, type, parentName);
      },
    );

    and(
      /^an actor exists with name "(.*)" and type "(.*)" under parent "(.*)"$/,
      async (name: string, type: string, parentName: string) => {
        await createHierarchyActor(name, type, parentName);
      },
    );

    when(/^I request the actor details of "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/actors/${hierarchyIds.get(name)}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include parent "(.*)"$/, (name: string) => {
      expect(response.body.parent).not.toBeNull();
      expect(response.body.parent.name).toBe(name);
    });

    and(/^the response should include ancestors "(.*)"$/, (names: string) => {
      const expected = names.split(',').map((n) => n.trim());
      const actual = response.body.ancestors.map((a: { name: string }) => a.name);
      expect(actual).toEqual(expected);
    });
  });

  test('Get a non-existent actor returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I request an actor with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/actors/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I request an actor with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer()).get(`/actors/${id}`);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- ASSIGN ACTOR IMAGE ---
defineFeature(imageFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdActorId: string;
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
    const buffer = Buffer.from('fake-image-content');
    const res = await request(getApp().getHttpServer())
      .post('/files/upload')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .attach('file', buffer, { filename: name, contentType: 'image/png' });
    fileIds[name] = res.body.id;
    return res.body.id;
  }

  test('Create actor with image', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    when(
      /^I create an actor with image "(.*)" and:$/,
      async (imageName: string, table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            type: row.type,
            purpose: row.purpose,
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

  test('Create actor with non-existent image', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I create an actor with a non-existent image and:$/,
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            type: row.type,
            purpose: row.purpose,
            imageId: '00000000-0000-0000-0000-000000000000',
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test("Update actor's image", ({ given, when, then, and }) => {
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
      /^an actor exists with name "(.*)" and type "(.*)" and image "(.*)"$/,
      async (name: string, type: string, imageName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, imageId: fileIds[imageName] });
        createdActorId = res.body.id;
      },
    );

    when(/^I update the actor's image to "(.*)"$/, async (imageName: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/actors/${createdActorId}`)
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

  test("Remove actor's image", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    and(
      /^an actor exists with name "(.*)" and type "(.*)" and image "(.*)"$/,
      async (name: string, type: string, imageName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, imageId: fileIds[imageName] });
        createdActorId = res.body.id;
      },
    );

    when("I update the actor's image to null", async () => {
      response = await request(getApp().getHttpServer())
        .patch(`/actors/${createdActorId}`)
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

  test('Get actor by ID includes image', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    and(
      /^an actor exists with name "(.*)" and type "(.*)" and image "(.*)"$/,
      async (name: string, type: string, imageName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, imageId: fileIds[imageName] });
        createdActorId = res.body.id;
      },
    );

    when('I request the actor by their ID', async () => {
      response = await request(getApp().getHttpServer())
        .get(`/actors/${createdActorId}`)
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

  test('List actors includes image data', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    and(
      /^an actor exists with name "(.*)" and type "(.*)" and image "(.*)"$/,
      async (name: string, type: string, imageName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type, imageId: fileIds[imageName] });
        createdActorId = res.body.id;
      },
    );

    when('I request the list of actors', async () => {
      response = await request(getApp().getHttpServer())
        .get('/actors')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the first actor in the list should include image "(.*)"$/, (name: string) => {
      expect(response.body.data.length).toBeGreaterThan(0);
      const actor = response.body.data[0];
      expect(actor.image).toBeTruthy();
      expect(actor.image.originalName).toBe(name);
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      'I create an actor with:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/actors')
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, type: row.type, purpose: row.purpose });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- ACTOR EVENTS ---
defineFeature(eventsFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let recordedActorId: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Creating an actor publishes marketlum.actor.created', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I create an actor for the event recorder$/, async () => {
      response = await request(getApp().getHttpServer())
        .post('/actors')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Event Actor', type: 'organization' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the event "([^"]+)" was published with the entity's id$/, (name: string) => {
      expectEventWithId(name);
    });
  });

  test('Updating an actor publishes marketlum.actor.updated', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an actor exists for the event recorder$/, async () => {
      const res = await request(getApp().getHttpServer())
        .post('/actors')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Pre-existing Actor', type: 'organization' });
      recordedActorId = res.body.id;
    });

    when(/^I update the recorded actor's name$/, async () => {
      response = await request(getApp().getHttpServer())
        .patch(`/actors/${recordedActorId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Renamed Actor' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the event "([^"]+)" was published with the entity's id$/, (name: string) => {
      expectEventWithId(name);
    });
  });

  test('Deleting an actor publishes marketlum.actor.deleted', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an actor exists for the event recorder$/, async () => {
      const res = await request(getApp().getHttpServer())
        .post('/actors')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: 'To Be Deleted', type: 'organization' });
      recordedActorId = res.body.id;
    });

    when(/^I delete the recorded actor$/, async () => {
      response = await request(getApp().getHttpServer())
        .delete(`/actors/${recordedActorId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the event "([^"]+)" was published with the entity's id$/, (name: string) => {
      expectEventWithId(name);
    });
  });
});
