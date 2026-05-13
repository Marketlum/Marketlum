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
  path.resolve(__dirname, '../../../../packages/bdd/features/exchange-rates/create-exchange-rate.feature'),
);
const listFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/exchange-rates/list-exchange-rates.feature'),
);
const getFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/exchange-rates/get-exchange-rate.feature'),
);
const updateFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/exchange-rates/update-exchange-rate.feature'),
);
const deleteFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/exchange-rates/delete-exchange-rate.feature'),
);
const lookupFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/exchange-rates/lookup-exchange-rate.feature'),
);

const ValueRegistry = new Map<string, string>();
let lastRateId: string;

async function ensureValue(authCookie: string, name: string): Promise<string> {
  if (ValueRegistry.has(name)) return ValueRegistry.get(name)!;
  const res = await request(getApp().getHttpServer())
    .post('/values')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'product', purpose: `Test value ${name}` });
  const id = res.body.id;
  ValueRegistry.set(name, id);
  return id;
}

async function createRate(
  authCookie: string,
  fromName: string,
  toName: string,
  rate: string,
  effectiveAt: string = new Date().toISOString(),
): Promise<request.Response> {
  return request(getApp().getHttpServer())
    .post('/exchange-rates')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({
      fromValueId: ValueRegistry.get(fromName),
      toValueId: ValueRegistry.get(toName),
      rate,
      effectiveAt,
    });
}

function resetRegistry() {
  ValueRegistry.clear();
}

// --- CREATE ---
defineFeature(createFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    resetRegistry();
  });
  afterAll(async () => {
    await teardownApp();
  });

  test('Successfully create an exchange rate', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    when(/^I create an exchange rate from "(.*)" to "(.*)" with rate "(.*)"$/, async (from: string, to: string, rate: string) => {
      response = await createRate(authCookie, from, to, rate);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(/^the response should contain a rate with value "(.*)"$/, (value: string) => {
      expect(response.body.rate).toBe(value);
    });
  });

  test('Submitting the pair reversed stores it canonically', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    when(/^I create an exchange rate from "(.*)" to "(.*)" with rate "(.*)"$/, async (from: string, to: string, rate: string) => {
      response = await createRate(authCookie, from, to, rate);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and('the canonical pair should match the lexicographic order of the value IDs', () => {
      expect(response.body.fromValue.id < response.body.toValue.id).toBe(true);
    });
  });

  test('Rejecting a rate where fromValue equals toValue', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    when(/^I create an exchange rate from "(.*)" to "(.*)" with rate "(.*)"$/, async (from: string, to: string, rate: string) => {
      const usdId = ValueRegistry.get(from)!;
      response = await request(getApp().getHttpServer())
        .post('/exchange-rates')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          fromValueId: usdId,
          toValueId: usdId,
          rate,
          effectiveAt: new Date().toISOString(),
        });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Rejecting a rate that is zero', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    when(/^I create an exchange rate from "(.*)" to "(.*)" with rate "(.*)"$/, async (from: string, to: string, rate: string) => {
      response = await createRate(authCookie, from, to, rate);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Rejecting a duplicate rate for the same pair at the same effectiveAt', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" at "(.*)"$/, async (from: string, to: string, rate: string, at: string) => {
      await createRate(authCookie, from, to, rate, at);
    });
    when(/^I create an exchange rate from "(.*)" to "(.*)" with rate "(.*)" at "(.*)"$/, async (from: string, to: string, rate: string, at: string) => {
      response = await createRate(authCookie, from, to, rate, at);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Allowing a future-dated effectiveAt', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    when(/^I create an exchange rate from "(.*)" to "(.*)" with rate "(.*)" at "(.*)"$/, async (from: string, to: string, rate: string, at: string) => {
      response = await createRate(authCookie, from, to, rate, at);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated user cannot create a rate', ({ when, then }) => {
    when('I create an exchange rate without authentication', async () => {
      response = await request(getApp().getHttpServer())
        .post('/exchange-rates')
        .set('X-CSRF-Protection', '1')
        .send({
          fromValueId: '00000000-0000-0000-0000-000000000000',
          toValueId: '00000000-0000-0000-0000-000000000001',
          rate: '1',
          effectiveAt: new Date().toISOString(),
        });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- LIST ---
defineFeature(listFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    resetRegistry();
  });
  afterAll(async () => {
    await teardownApp();
  });

  test('List rates with default pagination sorted by effectiveAt DESC', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" at "(.*)"$/, async (from: string, to: string, rate: string, at: string) => {
      await createRate(authCookie, from, to, rate, at);
    });
    and(/^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" at "(.*)"$/, async (from: string, to: string, rate: string, at: string) => {
      await createRate(authCookie, from, to, rate, at);
    });
    when('I request the list of exchange rates', async () => {
      response = await request(getApp().getHttpServer())
        .get('/exchange-rates')
        .set('Cookie', [authCookie]);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(/^the response should contain (\d+) exchange rates$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
    and(/^the first listed exchange rate should be effective at "(.*)"$/, (at: string) => {
      expect(new Date(response.body.data[0].effectiveAt).toISOString()).toBe(at);
    });
  });

  test('Filter by pair returns rows for that pair in either direction', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" at "(.*)"$/, async (from: string, to: string, rate: string, at: string) => {
      await createRate(authCookie, from, to, rate, at);
    });
    and(/^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" at "(.*)"$/, async (from: string, to: string, rate: string, at: string) => {
      await createRate(authCookie, from, to, rate, at);
    });
    when(/^I request the list of exchange rates filtered by pair "(.*)" and "(.*)"$/, async (a: string, b: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/exchange-rates?fromValueId=${ValueRegistry.get(a)}&toValueId=${ValueRegistry.get(b)}`)
        .set('Cookie', [authCookie]);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(/^the response should contain (\d+) exchange rates$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Filter by as-of date excludes future-dated rows', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" at "(.*)"$/, async (from: string, to: string, rate: string, at: string) => {
      await createRate(authCookie, from, to, rate, at);
    });
    and(/^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" at "(.*)"$/, async (from: string, to: string, rate: string, at: string) => {
      await createRate(authCookie, from, to, rate, at);
    });
    when(/^I request the list of exchange rates as of "(.*)"$/, async (at: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/exchange-rates?at=${encodeURIComponent(at)}`)
        .set('Cookie', [authCookie]);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(/^the response should contain (\d+) exchange rates$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Unauthenticated user cannot list exchange rates', ({ when, then }) => {
    when('I request the list of exchange rates without authentication', async () => {
      response = await request(getApp().getHttpServer()).get('/exchange-rates');
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- GET ---
defineFeature(getFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    resetRegistry();
  });
  afterAll(async () => {
    await teardownApp();
  });

  test('Get a rate by ID', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" at "(.*)"$/, async (from: string, to: string, rate: string, at: string) => {
      const res = await createRate(authCookie, from, to, rate, at);
      lastRateId = res.body.id;
    });
    when('I request the exchange rate', async () => {
      response = await request(getApp().getHttpServer())
        .get(`/exchange-rates/${lastRateId}`)
        .set('Cookie', [authCookie]);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(/^the response should contain a rate with value "(.*)"$/, (value: string) => {
      expect(response.body.rate).toBe(value);
    });
  });

  test('Getting a non-existent rate returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    when(/^I request the exchange rate with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/exchange-rates/${id}`)
        .set('Cookie', [authCookie]);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- UPDATE ---
defineFeature(updateFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    resetRegistry();
  });
  afterAll(async () => {
    await teardownApp();
  });

  test('Update the rate value', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" at "(.*)"$/, async (from: string, to: string, rate: string, at: string) => {
      const res = await createRate(authCookie, from, to, rate, at);
      lastRateId = res.body.id;
    });
    when(/^I update the exchange rate with rate "(.*)"$/, async (rate: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/exchange-rates/${lastRateId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ rate });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(/^the response should contain a rate with value "(.*)"$/, (value: string) => {
      expect(response.body.rate).toBe(value);
    });
  });

  test('Update the source', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" at "(.*)"$/, async (from: string, to: string, rate: string, at: string) => {
      const res = await createRate(authCookie, from, to, rate, at);
      lastRateId = res.body.id;
    });
    when(/^I update the exchange rate with source "(.*)"$/, async (source: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/exchange-rates/${lastRateId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ source });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(/^the response source should be "(.*)"$/, (source: string) => {
      expect(response.body.source).toBe(source);
    });
  });

  test('Updating to a duplicate \\(pair, effectiveAt) returns 409', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" at "(.*)"$/, async (from: string, to: string, rate: string, at: string) => {
      await createRate(authCookie, from, to, rate, at);
    });
    and(/^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" at "(.*)"$/, async (from: string, to: string, rate: string, at: string) => {
      const res = await createRate(authCookie, from, to, rate, at);
      lastRateId = res.body.id;
    });
    when(/^I update the exchange rate with effectiveAt "(.*)"$/, async (at: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/exchange-rates/${lastRateId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ effectiveAt: at });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DELETE ---
defineFeature(deleteFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    resetRegistry();
  });
  afterAll(async () => {
    await teardownApp();
  });

  test('Successfully delete an exchange rate', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" at "(.*)"$/, async (from: string, to: string, rate: string, at: string) => {
      const res = await createRate(authCookie, from, to, rate, at);
      lastRateId = res.body.id;
    });
    when('I delete the exchange rate', async () => {
      response = await request(getApp().getHttpServer())
        .delete(`/exchange-rates/${lastRateId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Deleting a non-existent rate returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    when(/^I delete the exchange rate with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/exchange-rates/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- LOOKUP ---
defineFeature(lookupFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    resetRegistry();
  });
  afterAll(async () => {
    await teardownApp();
  });

  function lookupRate(from: string, to: string, at: string) {
    return request(getApp().getHttpServer())
      .get(
        `/exchange-rates/lookup?fromValueId=${ValueRegistry.get(from)}&toValueId=${ValueRegistry.get(to)}&at=${encodeURIComponent(at)}`,
      )
      .set('Cookie', [authCookie]);
  }

  test('Symmetric lookup returns the stored rate in the canonical direction', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" at "(.*)"$/, async (from: string, to: string, rate: string, at: string) => {
      await createRate(authCookie, from, to, rate, at);
    });
    when(/^I look up the exchange rate from "(.*)" to "(.*)" as of "(.*)"$/, async (from: string, to: string, at: string) => {
      response = await lookupRate(from, to, at);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(/^the looked-up rate should be "(.*)"$/, (value: string) => {
      expect(response.body.rate).toBe(value);
    });
  });

  test('Symmetric lookup returns the inverted rate in the reverse direction', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" at "(.*)"$/, async (from: string, to: string, rate: string, at: string) => {
      await createRate(authCookie, from, to, rate, at);
    });
    when(/^I look up the exchange rate from "(.*)" to "(.*)" as of "(.*)"$/, async (from: string, to: string, at: string) => {
      response = await lookupRate(from, to, at);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(/^the looked-up rate should be approximately "(.*)"$/, (approx: string) => {
      expect(response.body.rate.startsWith(approx)).toBe(true);
    });
  });

  test('Lookup for a missing pair returns null', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    when(/^I look up the exchange rate from "(.*)" to "(.*)" as of "(.*)"$/, async (from: string, to: string, at: string) => {
      response = await lookupRate(from, to, at);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and('the looked-up response should be null', () => {
      expect(response.body).toBeNull();
    });
  });

  test('Lookup picks the latest row with effectiveAt at or before the query time', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" at "(.*)"$/, async (from: string, to: string, rate: string, at: string) => {
      await createRate(authCookie, from, to, rate, at);
    });
    and(/^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" at "(.*)"$/, async (from: string, to: string, rate: string, at: string) => {
      await createRate(authCookie, from, to, rate, at);
    });
    when(/^I look up the exchange rate from "(.*)" to "(.*)" as of "(.*)"$/, async (from: string, to: string, at: string) => {
      response = await lookupRate(from, to, at);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(/^the looked-up rate should be "(.*)"$/, (value: string) => {
      expect(response.body.rate).toBe(value);
    });
  });

  test('Future-dated rows are ignored when querying as of an earlier time', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureValue(authCookie, name);
    });
    and(/^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" at "(.*)"$/, async (from: string, to: string, rate: string, at: string) => {
      await createRate(authCookie, from, to, rate, at);
    });
    when(/^I look up the exchange rate from "(.*)" to "(.*)" as of "(.*)"$/, async (from: string, to: string, at: string) => {
      response = await lookupRate(from, to, at);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and('the looked-up response should be null', () => {
      expect(response.body).toBeNull();
    });
  });
});
