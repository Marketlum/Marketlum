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
  path.resolve(__dirname, '../../../../packages/bdd/features/locales/create-locale.feature'),
);
const listFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/locales/list-locales.feature'),
);
const deleteFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/locales/delete-locale.feature'),
);

let lastLocaleId: string;

async function createLocale(
  authCookie: string,
  code: string,
): Promise<request.Response> {
  return request(getApp().getHttpServer())
    .post('/locales')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ code });
}

// --- CREATE LOCALE ---
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

  test('Successfully create a locale', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I create a locale with code "(.*)"$/, async (code: string) => {
      response = await createLocale(authCookie, code);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a locale with code "(.*)"$/, (code: string) => {
      expect(response.body.code).toBe(code);
    });
  });

  test('Creating a locale with duplicate code fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a locale exists with code "(.*)"$/, async (code: string) => {
      await createLocale(authCookie, code);
    });

    when(/^I create a locale with code "(.*)"$/, async (code: string) => {
      response = await createLocale(authCookie, code);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Creating a locale with invalid code fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I create a locale with code "(.*)"$/, async (code: string) => {
      response = await createLocale(authCookie, code);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Creating a locale without code fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create a locale without code', async () => {
      response = await request(getApp().getHttpServer())
        .post('/locales')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({});
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated user cannot create a locale', ({ when, then }) => {
    when('I create a locale without authentication', async () => {
      response = await request(getApp().getHttpServer())
        .post('/locales')
        .set('X-CSRF-Protection', '1')
        .send({ code: 'en-US' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- LIST LOCALES ---
defineFeature(listFeature, (test) => {
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

  test('List locales with default pagination', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a locale exists with code "(.*)"$/, async (code: string) => {
      await createLocale(authCookie, code);
    });

    and(/^a locale exists with code "(.*)"$/, async (code: string) => {
      await createLocale(authCookie, code);
    });

    and(/^a locale exists with code "(.*)"$/, async (code: string) => {
      await createLocale(authCookie, code);
    });

    when('I request the list of locales', async () => {
      response = await request(getApp().getHttpServer())
        .get('/locales')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) locales$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Unauthenticated user cannot list locales', ({ when, then }) => {
    when('I request the list of locales without authentication', async () => {
      response = await request(getApp().getHttpServer())
        .get('/locales');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DELETE LOCALE ---
defineFeature(deleteFeature, (test) => {
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

  test('Successfully delete a locale', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a locale exists with code "(.*)"$/, async (code: string) => {
      const res = await createLocale(authCookie, code);
      lastLocaleId = res.body.id;
    });

    when('I delete the locale', async () => {
      response = await request(getApp().getHttpServer())
        .delete(`/locales/${lastLocaleId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Delete a non-existent locale returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I delete the locale with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/locales/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated user cannot delete a locale', ({ when, then }) => {
    when('I delete a locale without authentication', async () => {
      response = await request(getApp().getHttpServer())
        .delete('/locales/00000000-0000-0000-0000-000000000000')
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
