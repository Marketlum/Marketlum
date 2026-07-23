import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import {
  bootstrapApp,
  cleanDatabase,
  teardownApp,
  getApp,
  createAuthenticatedUser,
  createUserViaService,
} from '../setup';
import { ApiKeysService } from '@marketlum/core';

const managementFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/api-keys/management.feature'),
);

defineFeature(managementFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdKeyId: string;
  let otherUserKeyId: string;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    createdKeyId = '';
    otherUserKeyId = '';
  });
  afterAll(async () => {
    await teardownApp();
  });

  async function createOwnKey(name: string): Promise<request.Response> {
    const res = await request(getApp().getHttpServer())
      .post('/api-keys')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ name });
    createdKeyId = res.body.id;
    return res;
  }

  async function createOtherUsersKey(email: string, name: string): Promise<void> {
    const otherUser = await createUserViaService(email, 'password123', 'Other User');
    const created = await getApp().get(ApiKeysService).create(otherUser.id, { name });
    otherUserKeyId = created.id;
  }

  async function listOwnKeys(): Promise<request.Response> {
    return request(getApp().getHttpServer()).get('/api-keys').set('Cookie', [authCookie]);
  }

  test('Creating an API key reveals the plaintext key once', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    when(/^I create an API key named "(.*)"$/, async (name: string) => {
      response = await createOwnKey(name);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(/^the response should contain a plaintext key starting with "(.*)"$/, (prefix: string) => {
      expect(typeof response.body.key).toBe('string');
      expect(response.body.key.startsWith(prefix)).toBe(true);
      expect(response.body.key.length).toBeGreaterThan(40);
      expect(response.body.prefix).toBe(response.body.key.slice(0, 12));
    });
    and(/^the response should contain the key name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Listing API keys never exposes the key or its hash', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^I have created an API key named "(.*)"$/, async (name: string) => {
      await createOwnKey(name);
    });
    when('I list my API keys', async () => {
      response = await listOwnKeys();
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(
      /^the list should contain a key named "(.*)" with a prefix starting with "(.*)"$/,
      (name: string, prefix: string) => {
        const key = response.body.find((k: { name: string }) => k.name === name);
        expect(key).toBeDefined();
        expect(key.prefix.startsWith(prefix)).toBe(true);
      },
    );
    and('the list should not expose plaintext keys or hashes', () => {
      for (const key of response.body) {
        expect(key.key).toBeUndefined();
        expect(key.keyHash).toBeUndefined();
      }
    });
  });

  test('Listing API keys only shows my own keys', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^another user "(.*)" has an API key named "(.*)"$/, async (email: string, name: string) => {
      await createOtherUsersKey(email, name);
    });
    and(/^I have created an API key named "(.*)"$/, async (name: string) => {
      await createOwnKey(name);
    });
    when('I list my API keys', async () => {
      response = await listOwnKeys();
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(/^the list should contain a key named "(.*)"$/, (name: string) => {
      expect(response.body.some((k: { name: string }) => k.name === name)).toBe(true);
    });
    and(/^the list should not contain a key named "(.*)"$/, (name: string) => {
      expect(response.body.some((k: { name: string }) => k.name === name)).toBe(false);
    });
  });

  test('Deleting my API key', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^I have created an API key named "(.*)"$/, async (name: string) => {
      await createOwnKey(name);
    });
    when('I delete that API key', async () => {
      response = await request(getApp().getHttpServer())
        .delete(`/api-keys/${createdKeyId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and('my API key list should be empty', async () => {
      const list = await listOwnKeys();
      expect(list.body).toEqual([]);
    });
  });

  test("Deleting another user's API key returns 404", ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^another user "(.*)" has an API key named "(.*)"$/, async (email: string, name: string) => {
      await createOtherUsersKey(email, name);
    });
    when("I delete the other user's API key", async () => {
      response = await request(getApp().getHttpServer())
        .delete(`/api-keys/${otherUserKeyId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Creating an API key with an empty name fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    when('I create an API key with an empty name', async () => {
      response = await request(getApp().getHttpServer())
        .post('/api-keys')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: '' });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Creating an API key with a past expiration date fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    when('I create an API key expiring in the past', async () => {
      response = await request(getApp().getHttpServer())
        .post('/api-keys')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Past key', expiresAt: '2020-01-01T00:00:00.000Z' });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
