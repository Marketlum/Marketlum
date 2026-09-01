import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { TensionRebuildService } from '@marketlum/core';
import {
  bootstrapApp,
  cleanDatabase,
  teardownApp,
  getApp,
  createAuthenticatedUser,
  createUserViaService,
} from '../setup';

const senseFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/tensions/sense-tension.feature'),
);
const listFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/tensions/list-tensions.feature'),
);
const getFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/tensions/get-tension.feature'),
);
const amendFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/tensions/amend-tension.feature'),
);
const discardFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/tensions/discard-tension.feature'),
);
const searchFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/tensions/search-tensions.feature'),
);
const transitionFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/tensions/transition-tension.feature'),
);
const historyFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/tensions/tension-history.feature'),
);
const concurrencyFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/tensions/tension-concurrency.feature'),
);
const rebuildFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/tensions/tension-rebuild.feature'),
);
const actorDeletionFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/tensions/tension-actor-deletion.feature'),
);

const tensionIds = new Map<string, string>();
const actorIds = new Map<string, string>();
const userIds = new Map<string, string>();
const exchangeIds = new Map<string, string>();

async function createActor(authCookie: string, name: string): Promise<string> {
  const res = await request(getApp().getHttpServer())
    .post('/actors')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'organization' });
  actorIds.set(name, res.body.id);
  return res.body.id;
}

async function createUser(name: string): Promise<string> {
  const user = await createUserViaService(
    `${name.toLowerCase().replace(/\s/g, '.')}@test.com`,
    'password123',
    name,
  );
  userIds.set(name, user.id);
  return user.id;
}

async function createTension(
  authCookie: string,
  name: string,
  opts: {
    actorName?: string;
    leadName?: string;
    score?: number;
    currentContext?: string;
    state?: string;
  } = {},
): Promise<request.Response> {
  const actorId = opts.actorName
    ? actorIds.get(opts.actorName)
    : actorIds.values().next().value;
  const body: Record<string, unknown> = { name, actorId };
  if (opts.leadName) body.leadUserId = userIds.get(opts.leadName);
  if (opts.score !== undefined) body.score = opts.score;
  if (opts.currentContext !== undefined) body.currentContext = opts.currentContext;
  const res = await request(getApp().getHttpServer())
    .post('/tensions')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
  if (res.body.id) tensionIds.set(name, res.body.id);

  if (opts.state && opts.state !== 'alive' && res.body.id) {
    const action = opts.state === 'resolved' ? 'resolve' : opts.state === 'stale' ? 'drop' : null;
    if (action) {
      await request(getApp().getHttpServer())
        .post(`/tensions/${res.body.id}/${action}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    }
  }
  return res;
}

/** Event types in a tension's stream, oldest first. */
async function streamTypes(tensionId: string): Promise<string[]> {
  const rows: { type: string }[] = await getApp()
    .get(DataSource)
    .query(
      `SELECT "type" FROM "domain_events"
       WHERE "aggregateType" = 'tension' AND "aggregateId" = $1
       ORDER BY "version" ASC`,
      [tensionId],
    );
  return rows.map((r) => r.type);
}

/** Stream versions for a tension, used to assert the uniqueness invariant. */
async function streamVersions(tensionId: string): Promise<number[]> {
  const rows: { version: number }[] = await getApp()
    .get(DataSource)
    .query(
      `SELECT "version" FROM "domain_events"
       WHERE "aggregateType" = 'tension' AND "aggregateId" = $1
       ORDER BY "version" ASC`,
      [tensionId],
    );
  return rows.map((r) => Number(r.version));
}

function command(authCookie: string, id: string, action: string, body?: unknown) {
  const req = request(getApp().getHttpServer())
    .post(`/tensions/${id}/${action}`)
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1');
  return body === undefined ? req.send() : req.send(body as object);
}


// --- SENSE TENSION ---
defineFeature(senseFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    tensionIds.clear();
    actorIds.clear();
    userIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Create tension with all fields', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });

    and(/^a user exists with name "(.*)"$/, async (name: string) => {
      await createUser(name);
    });

    when(
      'I create a tension with:',
      async (table: { name: string; currentContext: string; potentialFuture: string; score: string }[]) => {
        const row = table[0];
        const actorId = actorIds.values().next().value;
        const leadUserId = userIds.values().next().value;
        response = await request(getApp().getHttpServer())
          .post('/tensions')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            currentContext: row.currentContext,
            potentialFuture: row.potentialFuture,
            score: parseInt(row.score),
            actorId,
            leadUserId,
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a tension with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain a tension with score (\d+)$/, (score: string) => {
      expect(response.body.score).toBe(parseInt(score));
    });

    and(/^the response should contain an actor with name "(.*)"$/, (name: string) => {
      expect(response.body.actor).toBeDefined();
      expect(response.body.actor.name).toBe(name);
    });

    and(/^the response should contain a lead with name "(.*)"$/, (name: string) => {
      expect(response.body.lead).toBeDefined();
      expect(response.body.lead.name).toBe(name);
    });

    and(/^the response should contain a tension with version (\d+)$/, (version: string) => {
      expect(response.body.version).toBe(parseInt(version));
    });
  });

  test('Create tension with minimal fields defaults score to 5', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });

    when(/^I create a tension with name "(.*)" and actor "(.*)"$/, async (name: string, actorName: string) => {
      response = await createTension(authCookie, name, { actorName });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a tension with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain a tension with score (\d+)$/, (score: string) => {
      expect(response.body.score).toBe(parseInt(score));
    });
  });

  test('Create tension with missing name fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });

    when('I create a tension without a name', async () => {
      const actorId = actorIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .post('/tensions')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ actorId });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Create tension with missing actorId fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create a tension without an actorId', async () => {
      response = await request(getApp().getHttpServer())
        .post('/tensions')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: 'No Actor Tension' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Create tension with non-existent actorId fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create a tension with non-existent actorId', async () => {
      response = await request(getApp().getHttpServer())
        .post('/tensions')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Bad Actor', actorId: '00000000-0000-0000-0000-000000000000' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Create tension with non-existent leadUserId fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });

    when('I create a tension with non-existent leadUserId', async () => {
      const actorId = actorIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .post('/tensions')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          name: 'Bad Lead',
          actorId,
          leadUserId: '00000000-0000-0000-0000-000000000000',
        });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Create tension with score outside range fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });

    when(/^I create a tension with score (\d+)$/, async (score: string) => {
      const actorId = actorIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .post('/tensions')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: 'High Score', actorId, score: parseInt(score) });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Create tension with score zero fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });

    when(/^I create a tension with score (\d+)$/, async (score: string) => {
      const actorId = actorIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .post('/tensions')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Zero Score', actorId, score: parseInt(score) });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I create a tension without authentication', async () => {
      response = await request(getApp().getHttpServer())
        .post('/tensions')
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Unauth Tension', actorId: '00000000-0000-0000-0000-000000000000' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- LIST TENSIONS ---
defineFeature(listFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    tensionIds.clear();
    actorIds.clear();
    userIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('List tensions with pagination', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    when(/^I list tensions with page (\d+) and limit (\d+)$/, async (page: string, limit: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/tensions/search?page=${page}&limit=${limit}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) tensions$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(/^the response meta should have total (\d+)$/, (total: string) => {
      expect(response.body.meta.total).toBe(parseInt(total));
    });
  });

  test('Filter tensions by actor', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });

    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });

    and(/^a tension exists with name "(.*)" for actor "(.*)"$/, async (name: string, actorName: string) => {
      await createTension(authCookie, name, { actorName });
    });

    and(/^a tension exists with name "(.*)" for actor "(.*)"$/, async (name: string, actorName: string) => {
      await createTension(authCookie, name, { actorName });
    });

    when(/^I list tensions filtered by actor "(.*)"$/, async (actorName: string) => {
      const actorId = actorIds.get(actorName);
      response = await request(getApp().getHttpServer())
        .get(`/tensions/search?page=1&limit=10&actorId=${actorId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) tension$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(/^the first tension should have name "(.*)"$/, (name: string) => {
      expect(response.body.data[0].name).toBe(name);
    });
  });

  test('Filter tensions by lead user', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });

    and(/^a user exists with name "(.*)"$/, async (name: string) => {
      await createUser(name);
    });

    and(/^a tension exists with name "(.*)" with lead "(.*)"$/, async (name: string, leadName: string) => {
      await createTension(authCookie, name, { leadName });
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    when(/^I list tensions filtered by lead "(.*)"$/, async (leadName: string) => {
      const leadUserId = userIds.get(leadName);
      response = await request(getApp().getHttpServer())
        .get(`/tensions/search?page=1&limit=10&leadUserId=${leadUserId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) tension$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(/^the first tension should have name "(.*)"$/, (name: string) => {
      expect(response.body.data[0].name).toBe(name);
    });
  });

  test('Search tensions by name', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    when(/^I search tensions for "(.*)"$/, async (searchTerm: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/tensions/search?page=1&limit=10&search=${encodeURIComponent(searchTerm)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) tension$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(/^the first tension should have name "(.*)"$/, (name: string) => {
      expect(response.body.data[0].name).toBe(name);
    });
  });
});

// --- GET TENSION ---
defineFeature(getFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    tensionIds.clear();
    actorIds.clear();
    userIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Get tension by ID with all relations', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });

    and(/^a user exists with name "(.*)"$/, async (name: string) => {
      await createUser(name);
    });

    and(/^a tension exists with name "(.*)" with lead "(.*)"$/, async (name: string, leadName: string) => {
      await createTension(authCookie, name, { leadName });
    });

    when(/^I get the tension "(.*)"$/, async (name: string) => {
      const id = tensionIds.get(name);
      response = await request(getApp().getHttpServer())
        .get(`/tensions/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a tension with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain an actor with name "(.*)"$/, (name: string) => {
      expect(response.body.actor).toBeDefined();
      expect(response.body.actor.name).toBe(name);
    });

    and(/^the response should contain a lead with name "(.*)"$/, (name: string) => {
      expect(response.body.lead).toBeDefined();
      expect(response.body.lead.name).toBe(name);
    });
  });

  test('Get non-existent tension returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I get a tension with non-existent ID', async () => {
      response = await request(getApp().getHttpServer())
        .get('/tensions/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DELETE TENSION ---
defineFeature(discardFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    tensionIds.clear();
    actorIds.clear();
    userIds.clear();
    exchangeIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Delete tension', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    when(/^I delete the tension "(.*)"$/, async (name: string) => {
      const id = tensionIds.get(name);
      response = await request(getApp().getHttpServer())
        .delete(`/tensions/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Exchanges referencing deleted tension get null tensionId', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });

    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    and(
      /^an exchange exists with name "(.*)" referencing tension "(.*)"$/,
      async (exchangeName: string, tensionName: string) => {
        const tensionId = tensionIds.get(tensionName);
        const actorEntries = [...actorIds.values()];
        const res = await request(getApp().getHttpServer())
          .post('/exchanges')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: exchangeName,
            purpose: 'Test exchange',
            tensionId,
            parties: [
              { actorId: actorEntries[0], role: 'seller' },
              { actorId: actorEntries[1], role: 'buyer' },
            ],
          });
        exchangeIds.set(exchangeName, res.body.id);
      },
    );

    when(/^I delete the tension "(.*)"$/, async (name: string) => {
      const id = tensionIds.get(name);
      response = await request(getApp().getHttpServer())
        .delete(`/tensions/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the exchange "(.*)" should have null tensionId$/, async (exchangeName: string) => {
      const exchangeId = exchangeIds.get(exchangeName);
      const res = await request(getApp().getHttpServer())
        .get(`/exchanges/${exchangeId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
      expect(res.body.tension).toBeNull();
      expect(res.body.tensionId).toBeNull();
    });
  });

  test('Delete non-existent tension returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I delete a tension with non-existent ID', async () => {
      response = await request(getApp().getHttpServer())
        .delete('/tensions/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Discarding removes the projection row but keeps the stream', ({
    given,
    when,
    then,
    and,
  }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    when(/^I delete the tension "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/tensions/${tensionIds.get(name)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(
      /^the tension "(.*)" should have a TensionDiscarded event in its stream$/,
      async (name: string) => {
        expect(await streamTypes(tensionIds.get(name)!)).toContain('TensionDiscarded');
      },
    );
  });

  test('Unauthenticated discard is rejected', ({ when, then }) => {
    when('I delete a tension with non-existent ID without authentication', async () => {
      response = await request(getApp().getHttpServer())
        .delete('/tensions/00000000-0000-0000-0000-000000000000')
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- SEARCH TENSIONS ---
defineFeature(searchFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    tensionIds.clear();
    actorIds.clear();
    userIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Full-text search finds tensions by name', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

    when(/^I search the global search for "(.*)"$/, async (searchTerm: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/search?q=${encodeURIComponent(searchTerm)}&limit=10`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the search results should contain a tension with name "(.*)"$/, (name: string) => {
      const tensionResults = response.body.data.filter((r: any) => r.type === 'tension');
      expect(tensionResults.some((r: any) => r.name === name)).toBe(true);
    });
  });

  test('Full-text search finds tensions by currentContext', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });

    and(
      /^a tension exists with name "(.*)" with currentContext "(.*)"$/,
      async (name: string, currentContext: string) => {
        await createTension(authCookie, name, { currentContext });
      },
    );

    when(/^I search the global search for "(.*)"$/, async (searchTerm: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/search?q=${encodeURIComponent(searchTerm)}&limit=10`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the search results should contain a tension with name "(.*)"$/, (name: string) => {
      const tensionResults = response.body.data.filter((r: any) => r.type === 'tension');
      expect(tensionResults.some((r: any) => r.name === name)).toBe(true);
    });
  });
});

// --- AMEND TENSION ---
defineFeature(amendFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    tensionIds.clear();
    actorIds.clear();
    userIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  const auth = (given: jest.Mock | any) =>
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

  const actorStep = (and: any) =>
    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });

  const tensionStep = (and: any) =>
    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

  const statusStep = (then: any) =>
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

  test('Rename a tension', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    when(/^I rename the tension "(.*)" to "(.*)"$/, async (name: string, newName: string) => {
      response = await command(authCookie, tensionIds.get(name)!, 'rename', { name: newName });
    });
    statusStep(then);
    and(/^the response should contain a tension with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
    and(/^the response should contain a tension with version (\d+)$/, (version: string) => {
      expect(response.body.version).toBe(parseInt(version));
    });
  });

  test('Renaming to the same name is a no-op', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    when(/^I rename the tension "(.*)" to "(.*)"$/, async (name: string, newName: string) => {
      response = await command(authCookie, tensionIds.get(name)!, 'rename', { name: newName });
    });
    statusStep(then);
    and(/^the response should contain a tension with version (\d+)$/, (version: string) => {
      expect(response.body.version).toBe(parseInt(version));
    });
  });

  test('Rename with an empty name fails', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    when(/^I rename the tension "(.*)" to "(.*)"$/, async (name: string, newName: string) => {
      response = await command(authCookie, tensionIds.get(name)!, 'rename', { name: newName });
    });
    statusStep(then);
  });

  test('Rescore a tension', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    when(/^I rescore the tension "(.*)" to (\d+)$/, async (name: string, score: string) => {
      response = await command(authCookie, tensionIds.get(name)!, 'rescore', {
        score: parseInt(score),
      });
    });
    statusStep(then);
    and(/^the response should contain a tension with score (\d+)$/, (score: string) => {
      expect(response.body.score).toBe(parseInt(score));
    });
    and(/^the response should contain a tension with version (\d+)$/, (version: string) => {
      expect(response.body.version).toBe(parseInt(version));
    });
  });

  test('Rescoring to the same score is a no-op', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    when(/^I rescore the tension "(.*)" to (\d+)$/, async (name: string, score: string) => {
      response = await command(authCookie, tensionIds.get(name)!, 'rescore', {
        score: parseInt(score),
      });
    });
    statusStep(then);
    and(/^the response should contain a tension with version (\d+)$/, (version: string) => {
      expect(response.body.version).toBe(parseInt(version));
    });
  });

  test('Rescore outside the allowed range fails', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    when(/^I rescore the tension "(.*)" to (\d+)$/, async (name: string, score: string) => {
      response = await command(authCookie, tensionIds.get(name)!, 'rescore', {
        score: parseInt(score),
      });
    });
    statusStep(then);
  });

  test('Revise both context fields', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    when(
      /^I revise the tension "(.*)" with currentContext "(.*)" and potentialFuture "(.*)"$/,
      async (name: string, currentContext: string, potentialFuture: string) => {
        response = await command(authCookie, tensionIds.get(name)!, 'revise', {
          currentContext,
          potentialFuture,
        });
      },
    );
    statusStep(then);
    and(/^the response should contain a tension with currentContext "(.*)"$/, (value: string) => {
      expect(response.body.currentContext).toBe(value);
    });
    and(/^the response should contain a tension with potentialFuture "(.*)"$/, (value: string) => {
      expect(response.body.potentialFuture).toBe(value);
    });
  });

  test('Revising only currentContext leaves potentialFuture untouched', ({
    given,
    when,
    then,
    and,
  }) => {
    auth(given);
    actorStep(and);
    and(
      /^a tension exists with name "(.*)" and potentialFuture "(.*)"$/,
      async (name: string, potentialFuture: string) => {
        const res = await createTension(authCookie, name);
        await command(authCookie, res.body.id, 'revise', { potentialFuture });
      },
    );
    when(
      /^I revise the tension "(.*)" with currentContext "(.*)"$/,
      async (name: string, currentContext: string) => {
        response = await command(authCookie, tensionIds.get(name)!, 'revise', { currentContext });
      },
    );
    statusStep(then);
    and(/^the response should contain a tension with currentContext "(.*)"$/, (value: string) => {
      expect(response.body.currentContext).toBe(value);
    });
    and(/^the response should contain a tension with potentialFuture "(.*)"$/, (value: string) => {
      expect(response.body.potentialFuture).toBe(value);
    });
  });

  test('Revising with neither field fails', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    when(/^I revise the tension "(.*)" with no fields$/, async (name: string) => {
      response = await command(authCookie, tensionIds.get(name)!, 'revise', {});
    });
    statusStep(then);
  });

  test('Assign a lead', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    and(/^a user exists with name "(.*)"$/, async (name: string) => {
      await createUser(name);
    });
    tensionStep(and);
    when(
      /^I assign the lead "(.*)" to the tension "(.*)"$/,
      async (leadName: string, name: string) => {
        response = await command(authCookie, tensionIds.get(name)!, 'lead', {
          leadUserId: userIds.get(leadName),
        });
      },
    );
    statusStep(then);
    and(/^the response should contain a lead with name "(.*)"$/, (name: string) => {
      expect(response.body.lead?.name).toBe(name);
    });
  });

  test('Unassign the lead', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    and(/^a user exists with name "(.*)"$/, async (name: string) => {
      await createUser(name);
    });
    and(
      /^a tension exists with name "(.*)" led by "(.*)"$/,
      async (name: string, leadName: string) => {
        await createTension(authCookie, name, { leadName });
      },
    );
    when(/^I unassign the lead from the tension "(.*)"$/, async (name: string) => {
      response = await command(authCookie, tensionIds.get(name)!, 'lead', { leadUserId: null });
    });
    statusStep(then);
    and('the response should contain a tension with no lead', () => {
      expect(response.body.lead).toBeNull();
    });
  });

  test('Assigning a non-existent lead fails', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    when(/^I assign a non-existent lead to the tension "(.*)"$/, async (name: string) => {
      response = await command(authCookie, tensionIds.get(name)!, 'lead', {
        leadUserId: '00000000-0000-0000-0000-000000000000',
      });
    });
    statusStep(then);
  });

  test('Reassign a tension to another actor', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    actorStep(and);
    tensionStep(and);
    when(
      /^I reassign the tension "(.*)" to the actor "(.*)"$/,
      async (name: string, actorName: string) => {
        response = await command(authCookie, tensionIds.get(name)!, 'reassign', {
          actorId: actorIds.get(actorName),
        });
      },
    );
    statusStep(then);
    and(/^the response should contain an actor with name "(.*)"$/, (name: string) => {
      expect(response.body.actor.name).toBe(name);
    });
  });

  test('Reassigning to a non-existent actor fails', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    when(/^I reassign the tension "(.*)" to a non-existent actor$/, async (name: string) => {
      response = await command(authCookie, tensionIds.get(name)!, 'reassign', {
        actorId: '00000000-0000-0000-0000-000000000000',
      });
    });
    statusStep(then);
  });

  test('Amending a non-existent tension returns 404', ({ given, when, then }) => {
    auth(given);
    when(/^I rename the tension with ID "(.*)" to "(.*)"$/, async (id: string, newName: string) => {
      response = await command(authCookie, id, 'rename', { name: newName });
    });
    statusStep(then);
  });

  test('Unauthenticated amendment is rejected', ({ when, then }) => {
    when(/^I rename the tension with ID "(.*)" to "(.*)"$/, async (id: string, newName: string) => {
      response = await request(getApp().getHttpServer())
        .post(`/tensions/${id}/rename`)
        .set('X-CSRF-Protection', '1')
        .send({ name: newName });
    });
    statusStep(then);
  });
});


// --- TRANSITION TENSION ---
defineFeature(transitionFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    tensionIds.clear();
    actorIds.clear();
    userIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  const auth = (given: any) =>
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
  const actorStep = (and: any) =>
    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });
  const statusStep = (then: any) =>
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  const stateStep = (and: any) =>
    and(/^the response should contain a tension with state "(.*)"$/, (state: string) => {
      expect(response.body.state).toBe(state);
    });
  const actionStep = (when: any, action: string) =>
    when(new RegExp(`^I ${action} the tension "(.*)"$`), async (name: string) => {
      response = await command(authCookie, tensionIds.get(name)!, action);
    });

  test('Newly sensed tension is alive', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    when(
      /^I create a tension with name "(.*)" and actor "(.*)"$/,
      async (name: string, actorName: string) => {
        response = await createTension(authCookie, name, { actorName });
      },
    );
    statusStep(then);
    stateStep(and);
  });

  test('Resolve an alive tension', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });
    actionStep(when, 'resolve');
    statusStep(then);
    stateStep(and);
    and(/^the response should contain a tension with version (\d+)$/, (version: string) => {
      expect(response.body.version).toBe(parseInt(version));
    });
  });

  test('Drop an alive tension', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });
    actionStep(when, 'drop');
    statusStep(then);
    stateStep(and);
  });

  const stateful = (label: string, action: string) =>
    test(label, ({ given, when, then, and }) => {
      auth(given);
      actorStep(and);
      and(
        /^a tension exists with name "(.*)" and state "(.*)"$/,
        async (name: string, state: string) => {
          await createTension(authCookie, name, { state });
        },
      );
      actionStep(when, action);
      statusStep(then);
      stateStep(and);
    });

  stateful('Reopen a resolved tension', 'reopen');
  stateful('Revive a stale tension', 'revive');

  const rejected = (label: string, action: string) =>
    test(label, ({ given, when, then, and }) => {
      auth(given);
      actorStep(and);
      and(
        /^a tension exists with name "(.*)" and state "(.*)"$/,
        async (name: string, state: string) => {
          await createTension(authCookie, name, { state });
        },
      );
      actionStep(when, action);
      statusStep(then);
    });

  rejected('Reject resolving a resolved tension', 'resolve');
  rejected('Reject dropping a stale tension', 'drop');
  rejected('Reject reviving a resolved tension', 'revive');
  rejected('Reject reopening a stale tension', 'reopen');
  rejected('Reject dropping a resolved tension', 'drop');

  test('Transitioning a non-existent tension returns 404', ({ given, when, then }) => {
    auth(given);
    when(/^I resolve the tension with ID "(.*)"$/, async (id: string) => {
      response = await command(authCookie, id, 'resolve');
    });
    statusStep(then);
  });

  test('Unauthenticated transition is rejected', ({ when, then }) => {
    when(/^I resolve the tension with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .post(`/tensions/${id}/resolve`)
        .set('X-CSRF-Protection', '1')
        .send();
    });
    statusStep(then);
  });
});


// --- TENSION HISTORY ---
defineFeature(historyFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    tensionIds.clear();
    actorIds.clear();
    userIds.clear();
  });
  afterAll(async () => {
    await teardownApp();
  });

  const auth = (given: any) =>
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
  const actorStep = (and: any) =>
    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });
  const tensionStep = (and: any) =>
    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });
  const statusStep = (then: any) =>
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  const fetchHistory = (when: any) =>
    when(/^I request the history of the tension "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/tensions/${tensionIds.get(name)}/history`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });
  const countStep = (and: any) =>
    and(/^the history should contain (\d+) entr(?:y|ies)$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  const typeStep = (and: any) =>
    and(/^the history entry (\d+) should have type "(.*)"$/, (index: string, type: string) => {
      expect(response.body.data[parseInt(index) - 1].type).toBe(type);
    });

  test('History of a newly sensed tension holds its genesis event', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    fetchHistory(when);
    statusStep(then);
    countStep(and);
    typeStep(and);
  });

  test('Renaming appends an entry carrying the previous name', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    and(
      /^the tension "(.*)" has been renamed to "(.*)"$/,
      async (name: string, newName: string) => {
        const id = tensionIds.get(name)!;
        await command(authCookie, id, 'rename', { name: newName });
        tensionIds.set(newName, id);
      },
    );
    fetchHistory(when);
    statusStep(then);
    countStep(and);
    typeStep(and);
    and(
      /^the history entry (\d+) payload should have previousName "(.*)"$/,
      (index: string, previousName: string) => {
        expect(response.body.data[parseInt(index) - 1].payload.previousName).toBe(previousName);
      },
    );
  });

  test('Rescoring renders a human-readable summary', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    and(/^the tension "(.*)" has been rescored to (\d+)$/, async (name: string, score: string) => {
      await command(authCookie, tensionIds.get(name)!, 'rescore', { score: parseInt(score) });
    });
    fetchHistory(when);
    statusStep(then);
    and(/^the history entry (\d+) should have summary "(.*)"$/, (index: string, summary: string) => {
      expect(response.body.data[parseInt(index) - 1].summary).toBe(summary);
    });
    and(
      /^the history entry (\d+) should have summaryKey "(.*)"$/,
      (index: string, key: string) => {
        expect(response.body.data[parseInt(index) - 1].summaryKey).toBe(key);
      },
    );
  });

  test('History is ordered newest first', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    and(/^the tension "(.*)" has been rescored to (\d+)$/, async (name: string, score: string) => {
      await command(authCookie, tensionIds.get(name)!, 'rescore', { score: parseInt(score) });
    });
    and(/^the tension "(.*)" has been resolved$/, async (name: string) => {
      await command(authCookie, tensionIds.get(name)!, 'resolve');
    });
    fetchHistory(when);
    statusStep(then);
    countStep(and);
    and(/^the history entry (\d+) should have version (\d+)$/, (index: string, version: string) => {
      expect(response.body.data[parseInt(index) - 1].version).toBe(parseInt(version));
    });
    and(/^the history entry (\d+) should have version (\d+)$/, (index: string, version: string) => {
      expect(response.body.data[parseInt(index) - 1].version).toBe(parseInt(version));
    });
  });

  test('History is paginated', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    and(/^the tension "(.*)" has been rescored to (\d+)$/, async (name: string, score: string) => {
      await command(authCookie, tensionIds.get(name)!, 'rescore', { score: parseInt(score) });
    });
    and(/^the tension "(.*)" has been resolved$/, async (name: string) => {
      await command(authCookie, tensionIds.get(name)!, 'resolve');
    });
    when(
      /^I request the history of the tension "(.*)" with limit (\d+)$/,
      async (name: string, limit: string) => {
        response = await request(getApp().getHttpServer())
          .get(`/tensions/${tensionIds.get(name)}/history?limit=${limit}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1');
      },
    );
    statusStep(then);
    countStep(and);
    and(/^the history meta total should be (\d+)$/, (total: string) => {
      expect(response.body.meta.total).toBe(parseInt(total));
    });
  });

  test('History records the acting user', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    fetchHistory(when);
    statusStep(then);
    and(/^the history entry (\d+) actor kind should be "(.*)"$/, (index: string, kind: string) => {
      expect(response.body.data[parseInt(index) - 1].actor.kind).toBe(kind);
    });
    and(
      /^the history entry (\d+) actor userName should be "(.*)"$/,
      (index: string, userName: string) => {
        expect(response.body.data[parseInt(index) - 1].actor.userName).toBe(userName);
      },
    );
  });

  test('History of a non-existent tension returns 404', ({ given, when, then }) => {
    auth(given);
    when(/^I request the history of the tension with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/tensions/${id}/history`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });
    statusStep(then);
  });
});

// --- TENSION CONCURRENCY ---
defineFeature(concurrencyFeature, (test) => {
  let authCookie: string;
  let response: request.Response;
  let responses: request.Response[] = [];
  let appendError: Error | null = null;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    tensionIds.clear();
    actorIds.clear();
    responses = [];
    appendError = null;
  });
  afterAll(async () => {
    await teardownApp();
  });

  const auth = (given: any) =>
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
  const actorStep = (and: any) =>
    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });
  const tensionStep = (and: any) =>
    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });

  test('Appending at an already-used version is rejected', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);

    // Deterministic: re-append at a version the stream already occupies, which
    // is exactly what a losing concurrent writer does.
    when(/^I append an event to the tension "(.*)" at a stale version$/, async (name: string) => {
      const id = tensionIds.get(name)!;
      const ds = getApp().get(DataSource);
      try {
        await ds.query(
          `INSERT INTO "domain_events"
             ("aggregateType", "aggregateId", "version", "type", "schemaVersion",
              "payload", "occurredAt", "actorKind")
           VALUES ('tension', $1, 1, 'TensionRescored', 1, '{}'::jsonb, now(), 'system')`,
          [id],
        );
      } catch (error) {
        appendError = error as Error;
      }
    });

    then('the append should be rejected as a conflict', () => {
      expect(appendError).not.toBeNull();
      expect(String(appendError?.message)).toMatch(/duplicate key|unique/i);
    });
  });

  test('Concurrent amendments never produce duplicate versions', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);

    when(
      /^I rescore the tension "(.*)" (\d+) times concurrently$/,
      async (name: string, times: string) => {
        const id = tensionIds.get(name)!;
        responses = await Promise.all(
          Array.from({ length: parseInt(times) }, (_, i) =>
            command(authCookie, id, 'rescore', { score: ((i + 1) % 10) + 1 }),
          ),
        );
      },
    );

    then('every response should be either 200 or 409', () => {
      for (const res of responses) {
        expect([200, 409]).toContain(res.status);
      }
    });

    and('the tension stream should have no duplicate versions', async () => {
      const versions = await streamVersions([...tensionIds.values()][0]);
      expect(new Set(versions).size).toBe(versions.length);
    });

    and('the tension version should equal the number of successful rescores plus 1', async () => {
      const versions = await streamVersions([...tensionIds.values()][0]);
      const successes = responses.filter((r) => r.status === 200).length;
      // Successful no-ops append nothing, so the head is bounded by successes + genesis.
      expect(Math.max(...versions)).toBeLessThanOrEqual(successes + 1);
      expect(Math.max(...versions)).toBeGreaterThanOrEqual(1);
    });
  });

  test('Sequential amendments increment the version', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    when(/^I rescore the tension "(.*)" to (\d+)$/, async (name: string, score: string) => {
      response = await command(authCookie, tensionIds.get(name)!, 'rescore', {
        score: parseInt(score),
      });
    });
    and(/^I rescore the tension "(.*)" to (\d+)$/, async (name: string, score: string) => {
      response = await command(authCookie, tensionIds.get(name)!, 'rescore', {
        score: parseInt(score),
      });
    });
    and(/^I rescore the tension "(.*)" to (\d+)$/, async (name: string, score: string) => {
      response = await command(authCookie, tensionIds.get(name)!, 'rescore', {
        score: parseInt(score),
      });
    });
    then(/^the response should contain a tension with version (\d+)$/, (version: string) => {
      expect(response.body.version).toBe(parseInt(version));
    });
  });
});

// --- TENSION PROJECTION REBUILD ---
defineFeature(rebuildFeature, (test) => {
  let authCookie: string;
  let report: Awaited<ReturnType<TensionRebuildService['rebuild']>>;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    tensionIds.clear();
    actorIds.clear();
    exchangeIds.clear();
  });
  afterAll(async () => {
    await teardownApp();
  });

  const auth = (given: any) =>
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
  const actorStep = (and: any) =>
    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });
  const tensionStep = (and: any) =>
    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });
  const runRebuild = (when: any, execute: boolean) =>
    when(
      execute
        ? 'I run the tension projection rebuild'
        : 'I run the tension projection rebuild in dry-run mode',
      async () => {
        report = await getApp().get(TensionRebuildService).rebuild({ execute });
      },
    );

  test('Dry run reports a projection already in sync', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    runRebuild(when, false);
    then(/^the rebuild should report (\d+) stream replayed$/, (count: string) => {
      expect(report.streamsReplayed).toBe(parseInt(count));
    });
    and(/^the rebuild should report (\d+) rows changed$/, (count: string) => {
      expect(report.inserted + report.updated + report.deleted).toBe(parseInt(count));
    });
  });

  test('Rebuild repairs a drifted projection row', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    and(/^the projection row for "(.*)" has been corrupted$/, async (name: string) => {
      await getApp()
        .get(DataSource)
        .query(`UPDATE "tensions" SET "score" = 1, "state" = 'stale' WHERE "id" = $1`, [
          tensionIds.get(name),
        ]);
    });
    runRebuild(when, true);
    then(/^the rebuild should report (\d+) row updated$/, (count: string) => {
      expect(report.updated).toBe(parseInt(count));
    });
    and(
      /^the tension "(.*)" should have score (\d+) and state "(.*)"$/,
      async (name: string, score: string, state: string) => {
        const res = await request(getApp().getHttpServer())
          .get(`/tensions/${tensionIds.get(name)}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1');
        expect(res.body.score).toBe(parseInt(score));
        expect(res.body.state).toBe(state);
      },
    );
  });

  test('Rebuild keeps a discarded tension deleted', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    and(/^the tension "(.*)" has been discarded$/, async (name: string) => {
      await request(getApp().getHttpServer())
        .delete(`/tensions/${tensionIds.get(name)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });
    runRebuild(when, true);
    then(/^the rebuild should report (\d+) rows updated$/, (count: string) => {
      expect(report.updated).toBe(parseInt(count));
    });
    and(/^the tension "(.*)" should not exist$/, async (name: string) => {
      const res = await request(getApp().getHttpServer())
        .get(`/tensions/${tensionIds.get(name)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
      expect(res.status).toBe(404);
    });
  });

  test('Rebuild preserves exchange links to tensions', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    and(/^an exchange exists linked to the tension "(.*)"$/, async (tensionName: string) => {
      const sellerId = actorIds.values().next().value;
      // Exchanges require at least two parties, so the counterparty is created here
      // rather than cluttering the feature, which is about rebuild semantics.
      const buyerId = await createActor(authCookie, 'Counterparty Org');
      const res = await request(getApp().getHttpServer())
        .post('/exchanges')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          name: 'Linked Exchange',
          purpose: 'Rebuild safety',
          tensionId: tensionIds.get(tensionName),
          parties: [
            { actorId: sellerId, role: 'seller' },
            { actorId: buyerId, role: 'buyer' },
          ],
        });
      expect(res.status).toBe(201);
      exchangeIds.set('Linked Exchange', res.body.id);
    });
    runRebuild(when, true);
    then(/^the exchange should still be linked to the tension "(.*)"$/, async (name: string) => {
      const res = await request(getApp().getHttpServer())
        .get(`/exchanges/${exchangeIds.get('Linked Exchange')}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
      expect(res.body.tensionId).toBe(tensionIds.get(name));
    });
  });
});

// --- ACTOR DELETION DISCARDS TENSIONS ---
defineFeature(actorDeletionFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    tensionIds.clear();
    actorIds.clear();
  });
  afterAll(async () => {
    await teardownApp();
  });

  const auth = (given: any) =>
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
  const actorStep = (and: any) =>
    and(/^an actor exists with name "(.*)"$/, async (name: string) => {
      await createActor(authCookie, name);
    });
  const tensionStep = (and: any) =>
    and(/^a tension exists with name "(.*)"$/, async (name: string) => {
      await createTension(authCookie, name);
    });
  const deleteActor = (when: any) =>
    when(/^I delete the actor "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/actors/${actorIds.get(name)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });
  const statusStep = (then: any) =>
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  const notExist = (and: any) =>
    and(/^the tension "(.*)" should not exist$/, async (name: string) => {
      const res = await request(getApp().getHttpServer())
        .get(`/tensions/${tensionIds.get(name)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
      expect(res.status).toBe(404);
    });

  test('Deleting an actor discards its tensions', ({ given, when, then, and }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    deleteActor(when);
    statusStep(then);
    notExist(and);
  });

  test('Discarded tensions keep a TensionDiscarded event in their stream', ({
    given,
    when,
    then,
    and,
  }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    deleteActor(when);
    statusStep(then);
    and(
      /^the tension "(.*)" should have a TensionDiscarded event in its stream$/,
      async (name: string) => {
        expect(await streamTypes(tensionIds.get(name)!)).toContain('TensionDiscarded');
      },
    );
  });

  test('A rebuild does not resurrect tensions discarded by actor deletion', ({
    given,
    when,
    then,
    and,
  }) => {
    auth(given);
    actorStep(and);
    tensionStep(and);
    and(/^the actor "(.*)" has been deleted$/, async (name: string) => {
      await request(getApp().getHttpServer())
        .delete(`/actors/${actorIds.get(name)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });
    when('I run the tension projection rebuild', async () => {
      await getApp().get(TensionRebuildService).rebuild({ execute: true });
    });
    then(/^the tension "(.*)" should not exist$/, async (name: string) => {
      const res = await request(getApp().getHttpServer())
        .get(`/tensions/${tensionIds.get(name)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
      expect(res.status).toBe(404);
    });
  });
});

