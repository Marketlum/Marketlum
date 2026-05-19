import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { DataSource } from 'typeorm';
import {
  bootstrapApp,
  cleanDatabase,
  teardownApp,
  getApp,
  createAuthenticatedUser,
} from '../setup';
import { ValueType } from '@marketlum/shared';

const presentationCurrencyFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/system-settings/presentation-currency.feature'),
);

const ValueRegistry = new Map<string, string>();

async function ensureCurrencyValue(authCookie: string, name: string): Promise<string> {
  if (ValueRegistry.has(name)) return ValueRegistry.get(name)!;
  const res = await request(getApp().getHttpServer())
    .post('/values')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: ValueType.CURRENCY, purpose: `Currency ${name}` });
  ValueRegistry.set(name, res.body.id);
  return res.body.id;
}

defineFeature(presentationCurrencyFeature, (test) => {
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

  test('Getting the presentation currency when unset returns null', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    when('I get the system presentation currency', async () => {
      response = await request(getApp().getHttpServer())
        .get('/system-settings/presentation-currency')
        .set('Cookie', [authCookie]);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and('the system presentation currency should be null', () => {
      expect(response.body.presentationCurrencyId).toBeNull();
    });
  });

  test('Setting the presentation currency', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureCurrencyValue(authCookie, name);
    });
    when(/^I set the system presentation currency to "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .put('/system-settings/presentation-currency')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ presentationCurrencyId: ValueRegistry.get(name) });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(/^the system presentation currency should be the ID of "(.*)"$/, (name: string) => {
      expect(response.body.presentationCurrencyId).toBe(ValueRegistry.get(name));
    });
  });

  test('Cannot change presentation currency once snapshots exist', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureCurrencyValue(authCookie, name);
    });
    and(/^a value exists named "(.*)"$/, async (name: string) => {
      await ensureCurrencyValue(authCookie, name);
    });
    and(/^the system presentation currency is set to "(.*)"$/, async (name: string) => {
      await request(getApp().getHttpServer())
        .put('/system-settings/presentation-currency')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ presentationCurrencyId: ValueRegistry.get(name) });
    });
    and('a recurring flow exists with a presentation snapshot', async () => {
      // Directly insert a recurring_flow row carrying a non-null presentationAmount
      // so the snapshot-lock guard is triggered without going through the whole
      // flow create plumbing (this scenario only cares about the guard).
      const ds = getApp().get<DataSource>(DataSource);
      const valueStream = await ds.query(
        `INSERT INTO value_streams ("code", "name", "level") VALUES ($1, $2, 0) RETURNING id`,
        ['ps-test-stream', 'Presentation snapshot test stream'],
      );
      const agent = await ds.query(
        `INSERT INTO agents ("name", "type") VALUES ($1, 'organization') RETURNING id`,
        ['Snapshot Lock Counterparty'],
      );
      const usdId = ValueRegistry.get('USD');
      await ds.query(
        `INSERT INTO recurring_flows
          ("valueStreamId", "counterpartyAgentId", "currencyId", direction,
           amount, frequency, "interval", "startDate", status,
           "presentationAmount", "presentationRate")
         VALUES ($1, $2, $3, 'inbound', 100, 'monthly', 1, '2026-01-01', 'active', 100, '1.0000000000')`,
        [valueStream[0].id, agent[0].id, usdId],
      );
    });
    when(/^I set the system presentation currency to "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .put('/system-settings/presentation-currency')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ presentationCurrencyId: ValueRegistry.get(name) });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated user cannot set the presentation currency', ({ when, then }) => {
    when('I set the system presentation currency to a value without authentication', async () => {
      response = await request(getApp().getHttpServer())
        .put('/system-settings/presentation-currency')
        .set('X-CSRF-Protection', '1')
        .send({ presentationCurrencyId: null });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
