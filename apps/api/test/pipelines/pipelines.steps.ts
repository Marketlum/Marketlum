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
  path.resolve(__dirname, '../../../../packages/bdd/features/pipelines/create-pipeline.feature'),
);
const getFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/pipelines/get-pipeline.feature'),
);
const searchFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/pipelines/search-pipelines.feature'),
);
const updateFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/pipelines/update-pipeline.feature'),
);
const deleteFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/pipelines/delete-pipeline.feature'),
);

const pipelineIds = new Map<string, string>();
const valueStreamIds = new Map<string, string>();

async function createValueStream(authCookie: string, name: string): Promise<string> {
  const res = await request(getApp().getHttpServer())
    .post('/value-streams')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name });
  valueStreamIds.set(name, res.body.id);
  return res.body.id;
}

async function createPipeline(
  authCookie: string,
  name: string,
  opts: {
    color?: string;
    purpose?: string;
    description?: string;
    valueStreamName?: string;
  } = {},
): Promise<request.Response> {
  const body: Record<string, unknown> = {
    name,
    color: opts.color || '#000000',
  };
  if (opts.purpose) body.purpose = opts.purpose;
  if (opts.description) body.description = opts.description;
  if (opts.valueStreamName) body.valueStreamId = valueStreamIds.get(opts.valueStreamName);

  const res = await request(getApp().getHttpServer())
    .post('/pipelines')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
  if (res.body.id) {
    pipelineIds.set(name, res.body.id);
  }
  return res;
}

// --- CREATE PIPELINE ---
defineFeature(createFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    pipelineIds.clear();
    valueStreamIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Create pipeline with all fields', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a value stream exists with name "(.*)"$/, async (name: string) => {
      await createValueStream(authCookie, name);
    });

    when(
      'I create a pipeline with:',
      async (table: { name: string; purpose: string; description: string; color: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/pipelines')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            purpose: row.purpose,
            description: row.description,
            color: row.color,
            valueStreamId: valueStreamIds.get('Commerce'),
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });

    and(/^the response should contain a pipeline with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain a pipeline with purpose "(.*)"$/, (purpose: string) => {
      expect(response.body.purpose).toBe(purpose);
    });

    and(/^the response should contain a pipeline with description "(.*)"$/, (description: string) => {
      expect(response.body.description).toBe(description);
    });

    and(/^the response should contain a pipeline with color "(.*)"$/, (color: string) => {
      expect(response.body.color).toBe(color);
    });

    and(/^the response should contain a valueStream with name "(.*)"$/, (name: string) => {
      expect(response.body.valueStream).not.toBeNull();
      expect(response.body.valueStream.name).toBe(name);
    });
  });

  test('Create pipeline with required fields only', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I create a pipeline with name "(.*)" and color "(.*)"$/, async (name: string, color: string) => {
      response = await request(getApp().getHttpServer())
        .post('/pipelines')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name, color });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });

    and(/^the response should contain a pipeline with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain a pipeline with color "(.*)"$/, (color: string) => {
      expect(response.body.color).toBe(color);
    });

    and('the response purpose should be null', () => {
      expect(response.body.purpose).toBeNull();
    });

    and('the response description should be null', () => {
      expect(response.body.description).toBeNull();
    });

    and('the response valueStream should be null', () => {
      expect(response.body.valueStream).toBeNull();
    });
  });

  test('Create pipeline with empty name fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create a pipeline with empty name', async () => {
      response = await request(getApp().getHttpServer())
        .post('/pipelines')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: '', color: '#000000' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });
  });

  test('Create pipeline with empty color fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create a pipeline with empty color', async () => {
      response = await request(getApp().getHttpServer())
        .post('/pipelines')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Test', color: '' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });
  });

  test('Create pipeline with non-existent valueStream fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create a pipeline with a non-existent valueStream', async () => {
      response = await request(getApp().getHttpServer())
        .post('/pipelines')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          name: 'Test',
          color: '#000000',
          valueStreamId: '00000000-0000-0000-0000-000000000000',
        });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I create a pipeline without authentication', async () => {
      response = await request(getApp().getHttpServer())
        .post('/pipelines')
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Test', color: '#000000' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });
  });
});

// --- GET PIPELINE ---
defineFeature(getFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    pipelineIds.clear();
    valueStreamIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Get an existing pipeline by ID', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a pipeline exists with name "(.*)" and color "(.*)"$/, async (name: string, color: string) => {
      await createPipeline(authCookie, name, { color });
    });

    when('I request the pipeline by its ID', async () => {
      const id = pipelineIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .get(`/pipelines/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });

    and(/^the response should contain a pipeline with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Get pipeline with valueStream loaded', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a value stream exists with name "(.*)"$/, async (name: string) => {
      await createValueStream(authCookie, name);
    });

    and(
      /^a pipeline exists with name "(.*)" and color "(.*)" and valueStream "(.*)"$/,
      async (name: string, color: string, vsName: string) => {
        await createPipeline(authCookie, name, { color, valueStreamName: vsName });
      },
    );

    when('I request the pipeline by its ID', async () => {
      const id = pipelineIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .get(`/pipelines/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });

    and(/^the response should contain a pipeline with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain a valueStream with name "(.*)"$/, (name: string) => {
      expect(response.body.valueStream).not.toBeNull();
      expect(response.body.valueStream.name).toBe(name);
    });
  });

  test('Get a non-existent pipeline returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I request a pipeline with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/pipelines/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I request a pipeline with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/pipelines/${id}`)
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });
  });
});

// --- SEARCH PIPELINES ---
defineFeature(searchFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    pipelineIds.clear();
    valueStreamIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Search with default pagination', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a pipeline exists with name "(.*)" and color "(.*)"$/, async (name: string, color: string) => {
      await createPipeline(authCookie, name, { color });
    });

    and(/^a pipeline exists with name "(.*)" and color "(.*)"$/, async (name: string, color: string) => {
      await createPipeline(authCookie, name, { color });
    });

    and(/^a pipeline exists with name "(.*)" and color "(.*)"$/, async (name: string, color: string) => {
      await createPipeline(authCookie, name, { color });
    });

    when('I search pipelines', async () => {
      response = await request(getApp().getHttpServer())
        .get('/pipelines/search')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });

    and('the response should contain a paginated list', () => {
      expect(response.body.data).toBeDefined();
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.page).toBeDefined();
      expect(response.body.meta.limit).toBeDefined();
      expect(response.body.meta.total).toBeDefined();
      expect(response.body.meta.totalPages).toBeDefined();
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(Number(count));
    });
  });

  test('Search by name text', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a pipeline exists with name "(.*)" and color "(.*)"$/, async (name: string, color: string) => {
      await createPipeline(authCookie, name, { color });
    });

    and(/^a pipeline exists with name "(.*)" and color "(.*)"$/, async (name: string, color: string) => {
      await createPipeline(authCookie, name, { color });
    });

    and(/^a pipeline exists with name "(.*)" and color "(.*)"$/, async (name: string, color: string) => {
      await createPipeline(authCookie, name, { color });
    });

    when(/^I search pipelines with search "(.*)"$/, async (search: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/pipelines/search?search=${encodeURIComponent(search)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(Number(count));
    });
  });

  test('Filter by valueStreamId', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a value stream exists with name "(.*)"$/, async (name: string) => {
      await createValueStream(authCookie, name);
    });

    and(/^a value stream exists with name "(.*)"$/, async (name: string) => {
      await createValueStream(authCookie, name);
    });

    and(
      /^a pipeline exists with name "(.*)" and color "(.*)" and valueStream "(.*)"$/,
      async (name: string, color: string, vsName: string) => {
        await createPipeline(authCookie, name, { color, valueStreamName: vsName });
      },
    );

    and(
      /^a pipeline exists with name "(.*)" and color "(.*)" and valueStream "(.*)"$/,
      async (name: string, color: string, vsName: string) => {
        await createPipeline(authCookie, name, { color, valueStreamName: vsName });
      },
    );

    and(/^a pipeline exists with name "(.*)" and color "(.*)"$/, async (name: string, color: string) => {
      await createPipeline(authCookie, name, { color });
    });

    when(/^I search pipelines with valueStreamId for "(.*)"$/, async (vsName: string) => {
      const vsId = valueStreamIds.get(vsName);
      response = await request(getApp().getHttpServer())
        .get(`/pipelines/search?valueStreamId=${vsId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(Number(count));
    });
  });

  test('Sort by name ascending', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a pipeline exists with name "(.*)" and color "(.*)"$/, async (name: string, color: string) => {
      await createPipeline(authCookie, name, { color });
    });

    and(/^a pipeline exists with name "(.*)" and color "(.*)"$/, async (name: string, color: string) => {
      await createPipeline(authCookie, name, { color });
    });

    and(/^a pipeline exists with name "(.*)" and color "(.*)"$/, async (name: string, color: string) => {
      await createPipeline(authCookie, name, { color });
    });

    when(/^I search pipelines sorted by "(.*)" "(.*)"$/, async (sortBy: string, sortOrder: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/pipelines/search?sortBy=${sortBy}&sortOrder=${sortOrder}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });

    and(/^the first pipeline should have name "(.*)"$/, (name: string) => {
      expect(response.body.data[0].name).toBe(name);
    });
  });

  test('Default sort by createdAt descending', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a pipeline exists with name "(.*)" and color "(.*)"$/, async (name: string, color: string) => {
      await createPipeline(authCookie, name, { color });
    });

    and(/^a pipeline exists with name "(.*)" and color "(.*)"$/, async (name: string, color: string) => {
      await createPipeline(authCookie, name, { color });
    });

    and(/^a pipeline exists with name "(.*)" and color "(.*)"$/, async (name: string, color: string) => {
      await createPipeline(authCookie, name, { color });
    });

    when('I search pipelines', async () => {
      response = await request(getApp().getHttpServer())
        .get('/pipelines/search')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });

    and(/^the first pipeline should have name "(.*)"$/, (name: string) => {
      expect(response.body.data[0].name).toBe(name);
    });
  });

  test('Empty results', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I search pipelines with search "(.*)"$/, async (search: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/pipelines/search?search=${encodeURIComponent(search)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(Number(count));
    });
  });
});

// --- UPDATE PIPELINE ---
defineFeature(updateFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    pipelineIds.clear();
    valueStreamIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Update all pipeline fields', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a value stream exists with name "(.*)"$/, async (name: string) => {
      await createValueStream(authCookie, name);
    });

    and(/^a pipeline exists with name "(.*)" and color "(.*)"$/, async (name: string, color: string) => {
      await createPipeline(authCookie, name, { color });
    });

    when(
      'I update the pipeline with:',
      async (table: { name: string; purpose: string; description: string; color: string }[]) => {
        const row = table[0];
        const id = pipelineIds.values().next().value;
        response = await request(getApp().getHttpServer())
          .patch(`/pipelines/${id}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            purpose: row.purpose,
            description: row.description,
            color: row.color,
            valueStreamId: valueStreamIds.get('New Stream'),
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });

    and(/^the response should contain a pipeline with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain a pipeline with purpose "(.*)"$/, (purpose: string) => {
      expect(response.body.purpose).toBe(purpose);
    });

    and(/^the response should contain a pipeline with description "(.*)"$/, (description: string) => {
      expect(response.body.description).toBe(description);
    });

    and(/^the response should contain a pipeline with color "(.*)"$/, (color: string) => {
      expect(response.body.color).toBe(color);
    });

    and(/^the response should contain a valueStream with name "(.*)"$/, (name: string) => {
      expect(response.body.valueStream).not.toBeNull();
      expect(response.body.valueStream.name).toBe(name);
    });
  });

  test('Partial update', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a pipeline exists with name "(.*)" and color "(.*)"$/, async (name: string, color: string) => {
      await createPipeline(authCookie, name, { color });
    });

    when(/^I update the pipeline's name to "(.*)"$/, async (name: string) => {
      const id = pipelineIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/pipelines/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });

    and(/^the response should contain a pipeline with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain a pipeline with color "(.*)"$/, (color: string) => {
      expect(response.body.color).toBe(color);
    });
  });

  test('Clear optional fields', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a value stream exists with name "(.*)"$/, async (name: string) => {
      await createValueStream(authCookie, name);
    });

    and(
      /^a pipeline exists with name "(.*)" and color "(.*)" and purpose "(.*)" and valueStream "(.*)"$/,
      async (name: string, color: string, purpose: string, vsName: string) => {
        await createPipeline(authCookie, name, { color, purpose, valueStreamName: vsName });
      },
    );

    when('I clear the pipeline optional fields', async () => {
      const id = pipelineIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/pipelines/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ purpose: null, description: null, valueStreamId: null });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });

    and('the response purpose should be null', () => {
      expect(response.body.purpose).toBeNull();
    });

    and('the response description should be null', () => {
      expect(response.body.description).toBeNull();
    });

    and('the response valueStream should be null', () => {
      expect(response.body.valueStream).toBeNull();
    });
  });

  test('Update a non-existent pipeline returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I update the pipeline with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/pipelines/${id}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      /^I update the pipeline with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/pipelines/${id}`)
          .set('X-CSRF-Protection', '1')
          .send({ name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });
  });
});

// --- DELETE PIPELINE ---
defineFeature(deleteFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    pipelineIds.clear();
    valueStreamIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Delete an existing pipeline', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a pipeline exists with name "(.*)" and color "(.*)"$/, async (name: string, color: string) => {
      await createPipeline(authCookie, name, { color });
    });

    when('I delete the pipeline', async () => {
      const id = pipelineIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .delete(`/pipelines/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });
  });

  test('Delete a non-existent pipeline returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I delete the pipeline with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/pipelines/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I delete the pipeline with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/pipelines/${id}`)
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(Number(status));
    });
  });
});
