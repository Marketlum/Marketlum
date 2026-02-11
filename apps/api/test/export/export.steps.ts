import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { bootstrapApp, cleanDatabase, teardownApp, getApp, createAuthenticatedUser } from '../setup';

const exportFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/export/export-data.feature'),
);

defineFeature(exportFeature, (test) => {
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

  test('Export all values with high limit returns all records', ({ given, when, then, and }) => {
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

    when(/^I request the list of values with limit (\d+)$/, async (limit: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/values?limit=${limit}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) values$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Export all values with filters applies filters correctly', ({ given, when, then, and }) => {
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

    when(
      /^I request the list of values with limit (\d+) and type "(.*)"$/,
      async (limit: string, type: string) => {
        response = await request(getApp().getHttpServer())
          .get(`/values?limit=${limit}&type=${type}`)
          .set('Cookie', [authCookie]);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) values$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Export all agents with high limit', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following agents exist:',
      async (table: { name: string; type: string; purpose: string }[]) => {
        for (const row of table) {
          await request(getApp().getHttpServer())
            .post('/agents')
            .set('Cookie', [authCookie])
            .set('X-CSRF-Protection', '1')
            .send({ name: row.name, type: row.type, purpose: row.purpose });
        }
      },
    );

    when(/^I request the list of agents with limit (\d+)$/, async (limit: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/agents?limit=${limit}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) agents$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Export all users with high limit', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following users exist:',
      async (table: { name: string; email: string; password: string }[]) => {
        for (const row of table) {
          await request(getApp().getHttpServer())
            .post('/users')
            .set('Cookie', [authCookie])
            .set('X-CSRF-Protection', '1')
            .send({ name: row.name, email: row.email, password: row.password });
        }
      },
    );

    when(/^I request the list of users with limit (\d+)$/, async (limit: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/users?limit=${limit}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) users$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Export values with search filter', ({ given, when, then, and }) => {
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

    when(
      /^I request the list of values with limit (\d+) and search "(.*)"$/,
      async (limit: string, search: string) => {
        response = await request(getApp().getHttpServer())
          .get(`/values?limit=${limit}&search=${encodeURIComponent(search)}`)
          .set('Cookie', [authCookie]);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) values$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Export values with sort', ({ given, when, then, and }) => {
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

    when(
      /^I request the list of values with limit (\d+) sorted by "(.*)" in "(.*)" order$/,
      async (limit: string, sortBy: string, sortOrder: string) => {
        response = await request(getApp().getHttpServer())
          .get(`/values?limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`)
          .set('Cookie', [authCookie]);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the first returned value should have name "(.*)"$/, (name: string) => {
      expect(response.body.data[0].name).toBe(name);
    });
  });

  test('Default limit still works', ({ given, when, then, and }) => {
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

    when(/^I request the list of values with limit (\d+)$/, async (limit: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/values?limit=${limit}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) values$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Unauthenticated export is rejected', ({ when, then }) => {
    when(/^I request the list of values with limit (\d+)$/, async (limit: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/values?limit=${limit}`);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
