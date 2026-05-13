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

const baseValueFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/system-settings/base-value.feature'),
);

const ValueRegistry = new Map<string, string>();

async function ensureValue(authCookie: string, name: string): Promise<string> {
  if (ValueRegistry.has(name)) return ValueRegistry.get(name)!;
  const res = await request(getApp().getHttpServer())
    .post('/values')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'product', purpose: `Test value ${name}` });
  ValueRegistry.set(name, res.body.id);
  return res.body.id;
}

defineFeature(baseValueFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    ValueRegistry.clear();
  });
  afterAll(async () => {
    await teardownApp();
  });

  test('Getting the base value when unset returns null', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    when('I get the system base value', async () => {
      response = await request(getApp().getHttpServer())
        .get('/system-settings/base-value')
        .set('Cookie', [authCookie]);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and('the system base value should be null', () => {
      expect(response.body.baseValueId).toBeNull();
    });
  });

  test('Setting the base value', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    when(/^I set the system base value to "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .put('/system-settings/base-value')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ baseValueId: ValueRegistry.get(name) });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(/^the system base value should be the ID of "(.*)"$/, (name: string) => {
      expect(response.body.baseValueId).toBe(ValueRegistry.get(name));
    });
  });

  test('Unauthenticated user cannot set the base value', ({ when, then }) => {
    when('I set the system base value to a value without authentication', async () => {
      response = await request(getApp().getHttpServer())
        .put('/system-settings/base-value')
        .set('X-CSRF-Protection', '1')
        .send({ baseValueId: null });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
