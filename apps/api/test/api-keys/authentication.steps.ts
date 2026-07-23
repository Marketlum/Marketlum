import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { ValueType } from '@marketlum/shared';
import {
  bootstrapApp,
  cleanDatabase,
  teardownApp,
  getApp,
  createAuthenticatedUser,
} from '../setup';

const authenticationFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/api-keys/authentication.feature'),
);

defineFeature(authenticationFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let plaintextKey: string;
  let createdKeyId: string;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    plaintextKey = '';
    createdKeyId = '';
  });
  afterAll(async () => {
    await teardownApp();
  });

  async function createOwnKey(name: string): Promise<void> {
    const res = await request(getApp().getHttpServer())
      .post('/api-keys')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ name });
    plaintextKey = res.body.key;
    createdKeyId = res.body.id;
  }

  function requestMeWithKey(key: string): Promise<request.Response> {
    return request(getApp().getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${key}`);
  }

  test('A valid API key authenticates a protected endpoint as its owner', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^I have created an API key named "(.*)"$/, async (name: string) => {
      await createOwnKey(name);
    });
    when('I request the current user using the API key', async () => {
      response = await requestMeWithKey(plaintextKey);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(/^the current user email should be "(.*)"$/, (email: string) => {
      expect(response.body.email).toBe(email);
    });
  });

  test('An unknown API key is rejected', ({ when, then }) => {
    when(/^I request the current user using the API key "(.*)"$/, async (key: string) => {
      response = await requestMeWithKey(key);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('A malformed bearer token is rejected', ({ when, then }) => {
    when(/^I request the current user using the API key "(.*)"$/, async (key: string) => {
      response = await requestMeWithKey(key);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('An expired API key is rejected', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^I have created an API key named "(.*)"$/, async (name: string) => {
      await createOwnKey(name);
    });
    and('that API key has expired', async () => {
      const ds = getApp().get<DataSource>(DataSource);
      await ds.query(`UPDATE "api_keys" SET "expiresAt" = now() - interval '1 day' WHERE "id" = $1`, [
        createdKeyId,
      ]);
    });
    when('I request the current user using the API key', async () => {
      response = await requestMeWithKey(plaintextKey);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('A deleted API key stops working immediately', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^I have created an API key named "(.*)"$/, async (name: string) => {
      await createOwnKey(name);
    });
    and('I delete that API key', async () => {
      await request(getApp().getHttpServer())
        .delete(`/api-keys/${createdKeyId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });
    when('I request the current user using the API key', async () => {
      response = await requestMeWithKey(plaintextKey);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('A mutation with an API key succeeds without a CSRF header', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^I have created an API key named "(.*)"$/, async (name: string) => {
      await createOwnKey(name);
    });
    when('I create a value using the API key without a CSRF header', async () => {
      response = await request(getApp().getHttpServer())
        .post('/values')
        .set('Authorization', `Bearer ${plaintextKey}`)
        .send({ name: 'API-created value', type: ValueType.CURRENCY, purpose: 'Created via API key' });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('An API key cannot manage API keys', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^I have created an API key named "(.*)"$/, async (name: string) => {
      await createOwnKey(name);
    });
    when('I list API keys using the API key', async () => {
      response = await request(getApp().getHttpServer())
        .get('/api-keys')
        .set('Authorization', `Bearer ${plaintextKey}`);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Using an API key records when it was last used', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^I have created an API key named "(.*)"$/, async (name: string) => {
      await createOwnKey(name);
    });
    and('the key has never been used', async () => {
      const list = await request(getApp().getHttpServer())
        .get('/api-keys')
        .set('Cookie', [authCookie]);
      const key = list.body.find((k: { id: string }) => k.id === createdKeyId);
      expect(key.lastUsedAt).toBeNull();
    });
    when('I request the current user using the API key', async () => {
      response = await requestMeWithKey(plaintextKey);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and('the key should have a last used timestamp', async () => {
      // The lastUsedAt touch is fire-and-forget, so poll briefly for it to land
      let lastUsedAt: string | null = null;
      for (let attempt = 0; attempt < 30 && !lastUsedAt; attempt++) {
        const list = await request(getApp().getHttpServer())
          .get('/api-keys')
          .set('Cookie', [authCookie]);
        lastUsedAt =
          list.body.find((k: { id: string }) => k.id === createdKeyId)?.lastUsedAt ?? null;
        if (!lastUsedAt) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      expect(lastUsedAt).not.toBeNull();
    });
  });

  test('Cookie session authentication continues to work', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    when('I request the current user using my session cookie', async () => {
      response = await request(getApp().getHttpServer())
        .get('/auth/me')
        .set('Cookie', [authCookie]);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(/^the current user email should be "(.*)"$/, (email: string) => {
      expect(response.body.email).toBe(email);
    });
  });
});
