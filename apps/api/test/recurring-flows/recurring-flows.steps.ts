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

const featurePath = (name: string) =>
  path.resolve(__dirname, `../../../../packages/bdd/features/recurring-flows/${name}.feature`);

const createFeature = loadFeature(featurePath('create-recurring-flow'));
const listFeature = loadFeature(featurePath('list-recurring-flows'));
const readFeature = loadFeature(featurePath('read-recurring-flow'));
const updateFeature = loadFeature(featurePath('update-recurring-flow'));
const deleteFeature = loadFeature(featurePath('delete-recurring-flow'));
const transitionsFeature = loadFeature(featurePath('status-transitions'));
const permissionsFeature = loadFeature(featurePath('permissions'));
const refIntegrityFeature = loadFeature(featurePath('referential-integrity'));
const rollupFeature = loadFeature(featurePath('rollup'));
const projectionFeature = loadFeature(featurePath('projection'));
const csvFeature = loadFeature(featurePath('csv-export'));

const RANDOM_UUID = '00000000-0000-0000-0000-000000000000';

// ---------- helpers ----------

function http() {
  return request(getApp().getHttpServer());
}

async function login(): Promise<string> {
  return createAuthenticatedUser('rfadmin@marketlum.com', 'password123', 'RF Admin');
}

async function createAgent(authCookie: string, name = 'Acme'): Promise<string> {
  const res = await http()
    .post('/agents')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'organization' });
  return res.body.id;
}

async function createValueStream(authCookie: string, name = 'Sales'): Promise<string> {
  const res = await http()
    .post('/value-streams')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name });
  return res.body.id;
}

async function createValue(authCookie: string, name = 'Advisory'): Promise<string> {
  const res = await http()
    .post('/values')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'service' });
  return res.body.id;
}

async function createTaxonomy(authCookie: string, name = 'Subscription'): Promise<string> {
  const res = await http()
    .post('/taxonomies')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name });
  return res.body.id;
}

interface FlowPayload {
  valueStreamId: string;
  counterpartyAgentId: string;
  valueId?: string;
  /** Free-text currency name; resolved to currencyId via ensureCurrency() before POST. */
  unit?: string;
  direction?: string;
  amount?: string;
  frequency?: string;
  interval?: number;
  startDate?: string;
  endDate?: string | null;
  taxonomyIds?: string[];
  description?: string;
}

function defaultFlow(overrides: Partial<FlowPayload> & Pick<FlowPayload, 'valueStreamId' | 'counterpartyAgentId'>): FlowPayload {
  return {
    direction: 'inbound',
    amount: '100',
    unit: 'USD',
    frequency: 'monthly',
    interval: 1,
    startDate: '2026-01-15',
    ...overrides,
  };
}

// Cache currency Values per (authCookie, name). The test DB is truncated
// per scenario so we keep the cache scoped accordingly.
const currencyCache = new Map<string, string>();

async function ensureCurrency(authCookie: string, name: string): Promise<string> {
  const key = `${authCookie}::${name}`;
  if (currencyCache.has(key)) return currencyCache.get(key)!;
  const res = await http()
    .post('/values')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'product', purpose: `Test currency ${name}` });
  const id = res.body.id;
  currencyCache.set(key, id);
  return id;
}

function clearCurrencyCache() {
  currencyCache.clear();
}

async function postFlow(authCookie: string, payload: Record<string, unknown>) {
  // Translate the legacy free-text `unit` into a Value reference (currencyId).
  // This lets the .feature files keep using "unit \"USD\"" while the API
  // contract now demands a currencyId FK.
  let body: Record<string, unknown> = { ...payload };
  if (body.unit !== undefined && body.currencyId === undefined && authCookie) {
    const unitName = body.unit as string;
    if (unitName) {
      try {
        body.currencyId = await ensureCurrency(authCookie, unitName);
      } catch {
        // Leave unit in place — server will reject and the test will surface it
      }
    }
    delete body.unit;
  }
  const req = http()
    .post('/recurring-flows')
    .set('X-CSRF-Protection', '1');
  if (authCookie) req.set('Cookie', [authCookie]);
  return req.send(body);
}

// ---------- CREATE ----------

defineFeature(createFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  const ids: Record<string, string> = {};

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => {
    await cleanDatabase(); clearCurrencyCache();
    authCookie = '';
    for (const k of Object.keys(ids)) delete ids[k];
  });
  afterAll(async () => { await teardownApp(); });

  function commonSteps({ given, and, when, then }: any) {
    given(/^I am authenticated$/, async () => { authCookie = await login(); });
    and(/^a value stream "(.*)" exists$/, async (name: string) => {
      ids[`vs:${name}`] = await createValueStream(authCookie, name);
    });
    and(/^an agent "(.*)" exists$/, async (name: string) => {
      ids[`ag:${name}`] = await createAgent(authCookie, name);
    });
    and(/^a taxonomy "(.*)" exists$/, async (name: string) => {
      ids[`tx:${name}`] = await createTaxonomy(authCookie, name);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status, 10));
    });
    and(/^the response should contain a recurring flow with amount "(.*)" and unit "(.*)"$/, (amount: string, unit: string) => {
      expect(response.body.amount).toBe(amount);
      expect(response.body.currency?.name).toBe(unit);
    });
    and(/^the response should contain a recurring flow with status "(.*)"$/, (status: string) => {
      expect(response.body.status).toBe(status);
    });
    and(/^the response should contain a recurring flow with direction "(.*)"$/, (direction: string) => {
      expect(response.body.direction).toBe(direction);
    });
    and(/^the response should contain a recurring flow with taxonomy "(.*)"$/, (name: string) => {
      expect((response.body.taxonomies ?? []).some((t: { name: string }) => t.name === name)).toBe(true);
    });
  }

  test('Create a minimal recurring flow', ({ given, and, when, then }) => {
    commonSteps({ given, and, when, then });
    when(
      /^I create a recurring flow with stream "(.*)", agent "(.*)", direction "(.*)", amount "(.*)", unit "(.*)", frequency "(.*)", interval (\d+), startDate "(.*)"$/,
      async (vs: string, ag: string, direction: string, amount: string, unit: string, frequency: string, interval: string, startDate: string) => {
        response = await postFlow(authCookie, defaultFlow({
          valueStreamId: ids[`vs:${vs}`],
          counterpartyAgentId: ids[`ag:${ag}`],
          direction,
          amount,
          unit,
          frequency,
          interval: parseInt(interval, 10),
          startDate,
        }));
      },
    );
  });

  test('Create a recurring flow with optional links and taxonomies', ({ given, and, when, then }) => {
    commonSteps({ given, and, when, then });
    when(
      /^I create a recurring flow with stream "(.*)", agent "(.*)", direction "(.*)", amount "(.*)", unit "(.*)", frequency "(.*)", interval (\d+), startDate "(.*)" and taxonomy "(.*)"$/,
      async (vs: string, ag: string, direction: string, amount: string, unit: string, frequency: string, interval: string, startDate: string, taxonomy: string) => {
        response = await postFlow(authCookie, defaultFlow({
          valueStreamId: ids[`vs:${vs}`],
          counterpartyAgentId: ids[`ag:${ag}`],
          direction,
          amount,
          unit,
          frequency,
          interval: parseInt(interval, 10),
          startDate,
          taxonomyIds: [ids[`tx:${taxonomy}`]],
        }));
      },
    );
  });

  test('Reject creation with missing required field', ({ given, and, when, then }) => {
    commonSteps({ given, and, when, then });
    when(/^I create a recurring flow missing the amount field$/, async () => {
      response = await postFlow(authCookie, {
        valueStreamId: ids['vs:Sales'],
        counterpartyAgentId: ids['ag:Acme'],
        direction: 'inbound',
        unit: 'USD',
        frequency: 'monthly',
        interval: 1,
        startDate: '2026-01-15',
      });
    });
  });

  test('Reject creation referencing a non-existent value stream', ({ given, and, when, then }) => {
    commonSteps({ given, and, when, then });
    when(
      /^I create a recurring flow with a random value stream id, agent "(.*)", direction "(.*)", amount "(.*)", unit "(.*)", frequency "(.*)", interval (\d+), startDate "(.*)"$/,
      async (ag: string, direction: string, amount: string, unit: string, frequency: string, interval: string, startDate: string) => {
        response = await postFlow(authCookie, defaultFlow({
          valueStreamId: RANDOM_UUID,
          counterpartyAgentId: ids[`ag:${ag}`],
          direction,
          amount,
          unit,
          frequency,
          interval: parseInt(interval, 10),
          startDate,
        }));
      },
    );
  });

  test('Reject creation with endDate before startDate', ({ given, and, when, then }) => {
    commonSteps({ given, and, when, then });
    when(
      /^I create a recurring flow with stream "(.*)", agent "(.*)", direction "(.*)", amount "(.*)", unit "(.*)", frequency "(.*)", interval (\d+), startDate "(.*)" and endDate "(.*)"$/,
      async (vs: string, ag: string, direction: string, amount: string, unit: string, frequency: string, interval: string, startDate: string, endDate: string) => {
        response = await postFlow(authCookie, defaultFlow({
          valueStreamId: ids[`vs:${vs}`],
          counterpartyAgentId: ids[`ag:${ag}`],
          direction,
          amount,
          unit,
          frequency,
          interval: parseInt(interval, 10),
          startDate,
          endDate,
        }));
      },
    );
  });
});

// ---------- LIST ----------

defineFeature(listFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  const ids: Record<string, string> = {};

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); clearCurrencyCache(); authCookie = ''; });
  afterAll(async () => { await teardownApp(); });

  async function seedFlow(overrides: Partial<FlowPayload> = {}) {
    const vsId = ids['vs'] || (ids['vs'] = await createValueStream(authCookie));
    const agId = ids['ag'] || (ids['ag'] = await createAgent(authCookie));
    await postFlow(authCookie, defaultFlow({ valueStreamId: vsId, counterpartyAgentId: agId, ...overrides }));
  }

  async function activate(flowId: string) {
    await http()
      .post(`/recurring-flows/${flowId}/transitions`)
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ action: 'activate' });
  }

  function authSteps({ given, then }: any) {
    given(/^I am authenticated$/, async () => { authCookie = await login(); });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status, 10));
    });
  }

  test('List all recurring flows with default pagination', ({ given, and, when, then }) => {
    authSteps({ given, then });
    and(/^(\d+) recurring flows exist$/, async (n: string) => {
      for (let i = 0; i < parseInt(n, 10); i++) await seedFlow();
    });
    when(/^I list recurring flows$/, async () => {
      response = await http().get('/recurring-flows').set('Cookie', [authCookie]);
    });
    and(/^the response should contain (\d+) recurring flows$/, (n: string) => {
      expect(response.body.data.length).toBe(parseInt(n, 10));
    });
  });

  test('Filter recurring flows by direction', ({ given, and, when, then }) => {
    authSteps({ given, then });
    and(/^(\d+) inbound recurring flows exist$/, async (n: string) => {
      for (let i = 0; i < parseInt(n, 10); i++) await seedFlow({ direction: 'inbound' });
    });
    and(/^(\d+) outbound recurring flow[s]? exists$/, async (n: string) => {
      for (let i = 0; i < parseInt(n, 10); i++) await seedFlow({ direction: 'outbound' });
    });
    when(/^I list recurring flows filtered by direction "(.*)"$/, async (direction: string) => {
      response = await http().get(`/recurring-flows?direction=${direction}`).set('Cookie', [authCookie]);
    });
    and(/^the response should contain (\d+) recurring flows$/, (n: string) => {
      expect(response.body.data.length).toBe(parseInt(n, 10));
    });
  });

  test('Filter recurring flows by status', ({ given, and, when, then }) => {
    authSteps({ given, then });
    and(/^(\d+) active recurring flows exist$/, async (n: string) => {
      for (let i = 0; i < parseInt(n, 10); i++) {
        const vsId = ids['vs'] || (ids['vs'] = await createValueStream(authCookie));
        const agId = ids['ag'] || (ids['ag'] = await createAgent(authCookie));
        const res = await postFlow(authCookie, defaultFlow({ valueStreamId: vsId, counterpartyAgentId: agId }));
        await activate(res.body.id);
      }
    });
    and(/^(\d+) draft recurring flow[s]? exists$/, async (n: string) => {
      for (let i = 0; i < parseInt(n, 10); i++) await seedFlow();
    });
    when(/^I list recurring flows filtered by status "(.*)"$/, async (status: string) => {
      response = await http().get(`/recurring-flows?status=${status}`).set('Cookie', [authCookie]);
    });
    and(/^the response should contain (\d+) recurring flows$/, (n: string) => {
      expect(response.body.data.length).toBe(parseInt(n, 10));
    });
  });

  test('Sort recurring flows by amount', ({ given, and, when, then }) => {
    authSteps({ given, then });
    and(/^a recurring flow with amount "(.*)" exists$/, async (amount: string) => {
      await seedFlow({ amount });
    });
    and(/^a recurring flow with amount "(.*)" exists$/, async (amount: string) => {
      await seedFlow({ amount });
    });
    and(/^a recurring flow with amount "(.*)" exists$/, async (amount: string) => {
      await seedFlow({ amount });
    });
    when(/^I list recurring flows sorted by amount ascending$/, async () => {
      response = await http().get('/recurring-flows?sortBy=amount&sortOrder=ASC').set('Cookie', [authCookie]);
    });
    and(/^the first recurring flow amount should be "(.*)"$/, (amount: string) => {
      expect(response.body.data[0].amount).toBe(amount);
    });
  });
});

// ---------- READ ----------

defineFeature(readFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let flowId: string;

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); clearCurrencyCache(); authCookie = ''; flowId = ''; });
  afterAll(async () => { await teardownApp(); });

  test('Read an existing recurring flow', ({ given, and, when, then }) => {
    given(/^I am authenticated$/, async () => { authCookie = await login(); });
    and(/^a recurring flow with amount "(.*)" exists$/, async (amount: string) => {
      const vsId = await createValueStream(authCookie);
      const agId = await createAgent(authCookie);
      const res = await postFlow(authCookie, defaultFlow({ valueStreamId: vsId, counterpartyAgentId: agId, amount }));
      flowId = res.body.id;
    });
    when(/^I read that recurring flow by id$/, async () => {
      response = await http().get(`/recurring-flows/${flowId}`).set('Cookie', [authCookie]);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status, 10));
    });
    and(/^the response should contain a recurring flow with amount "(.*)" and unit "(.*)"$/, (amount: string, unit: string) => {
      expect(response.body.amount).toBe(amount);
      expect(response.body.currency?.name).toBe(unit);
    });
  });

  test('Reading a non-existent recurring flow returns 404', ({ given, when, then }) => {
    given(/^I am authenticated$/, async () => { authCookie = await login(); });
    when(/^I read a recurring flow by a random id$/, async () => {
      response = await http().get(`/recurring-flows/${RANDOM_UUID}`).set('Cookie', [authCookie]);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status, 10));
    });
  });
});

// ---------- UPDATE ----------

defineFeature(updateFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let flowId: string;

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); clearCurrencyCache(); authCookie = ''; flowId = ''; });
  afterAll(async () => { await teardownApp(); });

  async function seedFlow(amount = '100') {
    const vsId = await createValueStream(authCookie);
    const agId = await createAgent(authCookie);
    const res = await postFlow(authCookie, defaultFlow({ valueStreamId: vsId, counterpartyAgentId: agId, amount }));
    flowId = res.body.id;
  }

  test('Update the amount of a recurring flow', ({ given, and, when, then }) => {
    given(/^I am authenticated$/, async () => { authCookie = await login(); });
    and(/^a recurring flow with amount "(.*)" exists$/, async (amount: string) => { await seedFlow(amount); });
    when(/^I update that recurring flow with amount "(.*)"$/, async (amount: string) => {
      response = await http()
        .patch(`/recurring-flows/${flowId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ amount });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status, 10));
    });
    and(/^the response should contain a recurring flow with amount "(.*)" and unit "(.*)"$/, (amount: string, unit: string) => {
      expect(response.body.amount).toBe(amount);
      expect(response.body.currency?.name).toBe(unit);
    });
  });

  test('Update the description and frequency of a recurring flow', ({ given, and, when, then }) => {
    given(/^I am authenticated$/, async () => { authCookie = await login(); });
    and(/^a recurring flow with amount "(.*)" exists$/, async (amount: string) => { await seedFlow(amount); });
    when(/^I update that recurring flow with description "(.*)" and frequency "(.*)"$/, async (description: string, frequency: string) => {
      response = await http()
        .patch(`/recurring-flows/${flowId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ description, frequency });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status, 10));
    });
    and(/^the response should contain a recurring flow with description "(.*)"$/, (description: string) => {
      expect(response.body.description).toBe(description);
    });
  });

  test('Updating a non-existent recurring flow returns 404', ({ given, when, then }) => {
    given(/^I am authenticated$/, async () => { authCookie = await login(); });
    when(/^I update a random recurring flow with amount "(.*)"$/, async (amount: string) => {
      response = await http()
        .patch(`/recurring-flows/${RANDOM_UUID}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ amount });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status, 10));
    });
  });
});

// ---------- DELETE ----------

defineFeature(deleteFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let flowId: string;

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); clearCurrencyCache(); authCookie = ''; flowId = ''; });
  afterAll(async () => { await teardownApp(); });

  async function seedFlow() {
    const vsId = await createValueStream(authCookie);
    const agId = await createAgent(authCookie);
    const res = await postFlow(authCookie, defaultFlow({ valueStreamId: vsId, counterpartyAgentId: agId }));
    flowId = res.body.id;
  }

  async function transition(action: string) {
    await http()
      .post(`/recurring-flows/${flowId}/transitions`)
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ action });
  }

  test('Delete a draft recurring flow', ({ given, and, when, then }) => {
    given(/^I am authenticated$/, async () => { authCookie = await login(); });
    and(/^a recurring flow with amount "(.*)" exists$/, async () => { await seedFlow(); });
    when(/^I delete that recurring flow$/, async () => {
      response = await http().delete(`/recurring-flows/${flowId}`).set('Cookie', [authCookie]).set('X-CSRF-Protection', '1');
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status, 10));
    });
  });

  test('Reject deletion of an active recurring flow', ({ given, and, when, then }) => {
    given(/^I am authenticated$/, async () => { authCookie = await login(); });
    and(/^a recurring flow with amount "(.*)" exists$/, async () => { await seedFlow(); });
    and(/^I transition that recurring flow with action "(.*)"$/, async (action: string) => { await transition(action); });
    when(/^I delete that recurring flow$/, async () => {
      response = await http().delete(`/recurring-flows/${flowId}`).set('Cookie', [authCookie]).set('X-CSRF-Protection', '1');
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status, 10));
    });
  });

  test('Deleting a non-existent recurring flow returns 404', ({ given, when, then }) => {
    given(/^I am authenticated$/, async () => { authCookie = await login(); });
    when(/^I delete a random recurring flow$/, async () => {
      response = await http().delete(`/recurring-flows/${RANDOM_UUID}`).set('Cookie', [authCookie]).set('X-CSRF-Protection', '1');
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status, 10));
    });
  });
});

// ---------- STATUS TRANSITIONS ----------

defineFeature(transitionsFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let flowId: string;

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => { await cleanDatabase(); clearCurrencyCache(); authCookie = ''; flowId = ''; });
  afterAll(async () => { await teardownApp(); });

  async function seedFlow() {
    const vsId = await createValueStream(authCookie);
    const agId = await createAgent(authCookie);
    const res = await postFlow(authCookie, defaultFlow({ valueStreamId: vsId, counterpartyAgentId: agId }));
    flowId = res.body.id;
  }

  async function transition(action: string, endDate?: string) {
    const body: Record<string, unknown> = { action };
    if (endDate) body.endDate = endDate;
    return http()
      .post(`/recurring-flows/${flowId}/transitions`)
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send(body);
  }

  function common({ given, and, then }: any) {
    given(/^I am authenticated$/, async () => { authCookie = await login(); });
    and(/^a recurring flow with amount "(.*)" exists$/, async () => { await seedFlow(); });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status, 10));
    });
    and(/^the response should contain a recurring flow with status "(.*)"$/, (status: string) => {
      expect(response.body.status).toBe(status);
    });
    and(/^the response should contain a recurring flow with endDate "(.*)"$/, (endDate: string) => {
      expect(response.body.endDate).toBe(endDate);
    });
  }

  test('Activate a draft recurring flow', ({ given, and, when, then }) => {
    common({ given, and, then });
    when(/^I transition that recurring flow with action "(.*)"$/, async (action: string) => {
      response = await transition(action);
    });
  });

  test('Pause an active recurring flow', ({ given, and, when, then }) => {
    common({ given, and, then });
    and(/^I transition that recurring flow with action "(.*)"$/, async (action: string) => {
      await transition(action);
    });
    when(/^I transition that recurring flow with action "(.*)"$/, async (action: string) => {
      response = await transition(action);
    });
  });

  test('Resume a paused recurring flow', ({ given, and, when, then }) => {
    common({ given, and, then });
    and(/^I transition that recurring flow with action "(.*)"$/, async (action: string) => {
      await transition(action);
    });
    and(/^I transition that recurring flow with action "(.*)"$/, async (action: string) => {
      await transition(action);
    });
    when(/^I transition that recurring flow with action "(.*)"$/, async (action: string) => {
      response = await transition(action);
    });
  });

  test('End an active recurring flow with explicit endDate', ({ given, and, when, then }) => {
    common({ given, and, then });
    and(/^I transition that recurring flow with action "(.*)"$/, async (action: string) => {
      await transition(action);
    });
    when(/^I transition that recurring flow with action "(.*)" and endDate "(.*)"$/, async (action: string, endDate: string) => {
      response = await transition(action, endDate);
    });
  });

  test('Reject illegal transition (resume a draft flow)', ({ given, and, when, then }) => {
    common({ given, and, then });
    when(/^I transition that recurring flow with action "(.*)"$/, async (action: string) => {
      response = await transition(action);
    });
  });

  test('Reject illegal transition (activate an ended flow)', ({ given, and, when, then }) => {
    common({ given, and, then });
    and(/^I transition that recurring flow with action "(.*)"$/, async (action: string) => {
      await transition(action);
    });
    and(/^I transition that recurring flow with action "(.*)"$/, async (action: string) => {
      await transition(action);
    });
    when(/^I transition that recurring flow with action "(.*)"$/, async (action: string) => {
      response = await transition(action);
    });
  });
});

// ---------- PERMISSIONS ----------

defineFeature(permissionsFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  const ids: Record<string, string> = {};

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => {
    await cleanDatabase(); clearCurrencyCache();
    authCookie = '';
    for (const k of Object.keys(ids)) delete ids[k];
  });
  afterAll(async () => { await teardownApp(); });

  test('Authenticated user can create a recurring flow', ({ given, and, when, then }) => {
    given(/^I am authenticated$/, async () => { authCookie = await login(); });
    and(/^a value stream "(.*)" exists$/, async (name: string) => { ids[`vs:${name}`] = await createValueStream(authCookie, name); });
    and(/^an agent "(.*)" exists$/, async (name: string) => { ids[`ag:${name}`] = await createAgent(authCookie, name); });
    when(
      /^I create a recurring flow with stream "(.*)", agent "(.*)", direction "(.*)", amount "(.*)", unit "(.*)", frequency "(.*)", interval (\d+), startDate "(.*)"$/,
      async (vs: string, ag: string, direction: string, amount: string, unit: string, frequency: string, interval: string, startDate: string) => {
        response = await postFlow(authCookie, defaultFlow({
          valueStreamId: ids[`vs:${vs}`],
          counterpartyAgentId: ids[`ag:${ag}`],
          direction,
          amount,
          unit,
          frequency,
          interval: parseInt(interval, 10),
          startDate,
        }));
      },
    );
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status, 10));
    });
  });

  test('Unauthenticated request to create a recurring flow is rejected', ({ given, and, when, then }) => {
    // need cookie to setup data, then drop it for the actual call
    given(/^a value stream "(.*)" exists$/, async (name: string) => {
      authCookie = await login();
      ids[`vs:${name}`] = await createValueStream(authCookie, name);
    });
    and(/^an agent "(.*)" exists$/, async (name: string) => {
      ids[`ag:${name}`] = await createAgent(authCookie, name);
    });
    when(/^I create a recurring flow without auth$/, async () => {
      response = await postFlow('', defaultFlow({
        valueStreamId: ids['vs:Sales'],
        counterpartyAgentId: ids['ag:Acme'],
      }));
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status, 10));
    });
  });

  test('Unauthenticated request to list recurring flows is rejected', ({ when, then }) => {
    when(/^I list recurring flows without auth$/, async () => {
      response = await http().get('/recurring-flows');
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status, 10));
    });
  });
});

// ---------- REFERENTIAL INTEGRITY ----------

defineFeature(refIntegrityFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let flowId: string;
  let agentId: string;
  let valueStreamId: string;
  let valueId: string;

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => {
    await cleanDatabase(); clearCurrencyCache();
    authCookie = '';
    flowId = '';
    agentId = '';
    valueStreamId = '';
    valueId = '';
  });
  afterAll(async () => { await teardownApp(); });

  async function seedFlow(withValue = false): Promise<void> {
    valueStreamId = await createValueStream(authCookie);
    agentId = await createAgent(authCookie);
    const payload: FlowPayload = defaultFlow({ valueStreamId, counterpartyAgentId: agentId });
    if (withValue) {
      valueId = await createValue(authCookie);
      payload.valueId = valueId;
    }
    const res = await postFlow(authCookie, payload);
    flowId = res.body.id;
  }

  test('Deleting an agent with a recurring flow attached is restricted', ({ given, and, when, then }) => {
    given(/^I am authenticated$/, async () => { authCookie = await login(); });
    and(/^a recurring flow with amount "(.*)" exists$/, async () => { await seedFlow(); });
    when(/^I delete the counterparty agent of that recurring flow$/, async () => {
      response = await http().delete(`/agents/${agentId}`).set('Cookie', [authCookie]).set('X-CSRF-Protection', '1');
    });
    then(/^the response status should not be (\d+)$/, (status: string) => {
      expect(response.status).not.toBe(parseInt(status, 10));
    });
  });

  test('Deleting a value referenced by a recurring flow nullifies the link', ({ given, and, when, then }) => {
    given(/^I am authenticated$/, async () => { authCookie = await login(); });
    and(/^a recurring flow with amount "(.*)" linked to a value exists$/, async () => { await seedFlow(true); });
    when(/^I delete the referenced value$/, async () => {
      await http().delete(`/values/${valueId}`).set('Cookie', [authCookie]).set('X-CSRF-Protection', '1');
    });
    and(/^I read that recurring flow by id$/, async () => {
      response = await http().get(`/recurring-flows/${flowId}`).set('Cookie', [authCookie]);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status, 10));
    });
    and(/^the response should contain a recurring flow with a null value link$/, () => {
      expect(response.body.value).toBeNull();
    });
  });

  test('Deleting a value stream with a recurring flow attached is restricted', ({ given, and, when, then }) => {
    given(/^I am authenticated$/, async () => { authCookie = await login(); });
    and(/^a recurring flow with amount "(.*)" exists$/, async () => { await seedFlow(); });
    when(/^I delete the value stream of that recurring flow$/, async () => {
      response = await http().delete(`/value-streams/${valueStreamId}`).set('Cookie', [authCookie]).set('X-CSRF-Protection', '1');
    });
    then(/^the response status should not be (\d+)$/, (status: string) => {
      expect(response.status).not.toBe(parseInt(status, 10));
    });
  });
});

// ---------- ROLLUP ----------

defineFeature(rollupFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  const ids: Record<string, string> = {};

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => {
    await cleanDatabase(); clearCurrencyCache();
    authCookie = '';
    for (const k of Object.keys(ids)) delete ids[k];
  });
  afterAll(async () => { await teardownApp(); });

  async function activate(flowId: string) {
    await http()
      .post(`/recurring-flows/${flowId}/transitions`)
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ action: 'activate' });
  }

  async function seedActiveFlow(streamId: string, amount: string, unit: string, direction: string) {
    const agId = ids['ag'] || (ids['ag'] = await createAgent(authCookie));
    const res = await postFlow(authCookie, defaultFlow({
      valueStreamId: streamId,
      counterpartyAgentId: agId,
      amount,
      unit,
      direction,
    }));
    await activate(res.body.id);
  }

  function common({ given, and, then }: any) {
    given(/^I am authenticated$/, async () => { authCookie = await login(); });
    and(/^a value stream "(.*)" exists$/, async (name: string) => {
      ids[`vs:${name}`] = await createValueStream(authCookie, name);
    });
    and(
      /^an active monthly recurring flow with amount "(.*)" and unit "(.*)" and direction "(.*)" exists for stream "(.*)"$/,
      async (amount: string, unit: string, direction: string, vs: string) => {
        await seedActiveFlow(ids[`vs:${vs}`], amount, unit, direction);
      },
    );
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status, 10));
    });
  }

  test('Rollup for an empty value stream', ({ given, and, when, then }) => {
    common({ given, and, then });
    when(/^I get the rollup for value stream "(.*)"$/, async (vs: string) => {
      response = await http().get(`/value-streams/${ids[`vs:${vs}`]}/recurring-flows/rollup`).set('Cookie', [authCookie]);
    });
    and(/^the rollup activeFlowCount should be (\d+)$/, (n: string) => {
      expect(response.body.activeFlowCount).toBe(parseInt(n, 10));
    });
  });

  test('Rollup for a stream with one active inbound monthly flow', ({ given, and, when, then }) => {
    common({ given, and, then });
    when(/^I get the rollup for value stream "(.*)"$/, async (vs: string) => {
      response = await http().get(`/value-streams/${ids[`vs:${vs}`]}/recurring-flows/rollup`).set('Cookie', [authCookie]);
    });
    and(/^the rollup activeFlowCount should be (\d+)$/, (n: string) => {
      expect(response.body.activeFlowCount).toBe(parseInt(n, 10));
    });
    and(/^the rollup inbound monthly total for "(.*)" should be "(.*)"$/, (unit: string, total: string) => {
      const inbound = response.body.byDirection.find((d: { direction: string }) => d.direction === 'inbound');
      const entry = inbound.totals.find((t: { unit: string }) => t.unit === unit);
      expect(entry.monthly).toBe(total);
    });
  });

  test('Rollup with mixed inbound and outbound flows of the same unit', ({ given, and, when, then }) => {
    common({ given, and, then });
    when(/^I get the rollup for value stream "(.*)"$/, async (vs: string) => {
      response = await http().get(`/value-streams/${ids[`vs:${vs}`]}/recurring-flows/rollup`).set('Cookie', [authCookie]);
    });
    and(/^the rollup net monthly total for "(.*)" should be "(.*)"$/, (unit: string, total: string) => {
      const entry = response.body.net.find((n: { unit: string }) => n.unit === unit);
      expect(entry.monthly).toBe(total);
    });
  });
});

// ---------- PROJECTION ----------

defineFeature(projectionFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  const ids: Record<string, string> = {};

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => {
    await cleanDatabase(); clearCurrencyCache();
    authCookie = '';
    for (const k of Object.keys(ids)) delete ids[k];
  });
  afterAll(async () => { await teardownApp(); });

  async function activate(flowId: string) {
    await http()
      .post(`/recurring-flows/${flowId}/transitions`)
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ action: 'activate' });
  }

  function todayISO(): string {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }

  function common({ given, and, then }: any) {
    given(/^I am authenticated$/, async () => { authCookie = await login(); });
    and(/^a value stream "(.*)" exists$/, async (name: string) => {
      ids[`vs:${name}`] = await createValueStream(authCookie, name);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status, 10));
    });
  }

  test('Projection for an empty value stream', ({ given, and, when, then }) => {
    common({ given, and, then });
    when(/^I get the projection for value stream "(.*)" with horizon (\d+)$/, async (vs: string, horizon: string) => {
      response = await http()
        .get(`/value-streams/${ids[`vs:${vs}`]}/recurring-flows/projection?monthsAhead=${horizon}`)
        .set('Cookie', [authCookie]);
    });
    and(/^the projection should have (\d+) months$/, (n: string) => {
      expect(response.body.months.length).toBe(parseInt(n, 10));
    });
  });

  test('Projection for a stream with a monthly inbound flow', ({ given, and, when, then }) => {
    common({ given, and, then });
    and(
      /^an active monthly recurring flow with amount "(.*)" and unit "(.*)" and direction "(.*)" starting today exists for stream "(.*)"$/,
      async (amount: string, unit: string, direction: string, vs: string) => {
        const agId = await createAgent(authCookie);
        const res = await postFlow(authCookie, defaultFlow({
          valueStreamId: ids[`vs:${vs}`],
          counterpartyAgentId: agId,
          amount,
          unit,
          direction,
          startDate: todayISO(),
        }));
        await activate(res.body.id);
      },
    );
    when(/^I get the projection for value stream "(.*)" with horizon (\d+)$/, async (vs: string, horizon: string) => {
      response = await http()
        .get(`/value-streams/${ids[`vs:${vs}`]}/recurring-flows/projection?monthsAhead=${horizon}`)
        .set('Cookie', [authCookie]);
    });
    and(/^the projection should have (\d+) months$/, (n: string) => {
      expect(response.body.months.length).toBe(parseInt(n, 10));
    });
    and(/^the first projection month should have inbound total "(.*)" for unit "(.*)"$/, (amount: string, unit: string) => {
      const inbound = response.body.months[0].byDirection.find((d: { direction: string }) => d.direction === 'inbound');
      const entry = inbound.totals.find((t: { unit: string }) => t.unit === unit);
      expect(entry.amount).toBe(amount);
    });
  });

  test('Projection caps horizon at 36 months', ({ given, and, when, then }) => {
    common({ given, and, then });
    when(/^I get the projection for value stream "(.*)" with horizon (\d+)$/, async (vs: string, horizon: string) => {
      response = await http()
        .get(`/value-streams/${ids[`vs:${vs}`]}/recurring-flows/projection?monthsAhead=${horizon}`)
        .set('Cookie', [authCookie]);
    });
    and(/^the projection horizon should be (\d+)$/, (n: string) => {
      expect(response.body.horizonMonths).toBe(parseInt(n, 10));
    });
  });
});

// ---------- CSV EXPORT ----------

defineFeature(csvFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  const ids: Record<string, string> = {};

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => {
    await cleanDatabase(); clearCurrencyCache();
    authCookie = '';
    for (const k of Object.keys(ids)) delete ids[k];
  });
  afterAll(async () => { await teardownApp(); });

  test('Export recurring flows as CSV', ({ given, and, when, then }) => {
    given(/^I am authenticated$/, async () => { authCookie = await login(); });
    and(/^(\d+) recurring flows exist$/, async (n: string) => {
      const vsId = await createValueStream(authCookie);
      const agId = await createAgent(authCookie);
      for (let i = 0; i < parseInt(n, 10); i++) {
        await postFlow(authCookie, defaultFlow({ valueStreamId: vsId, counterpartyAgentId: agId }));
      }
    });
    when(/^I export recurring flows as CSV$/, async () => {
      response = await http().get('/recurring-flows/export.csv').set('Cookie', [authCookie]);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status, 10));
    });
    and(/^the response Content-Type should contain "(.*)"$/, (type: string) => {
      expect(response.headers['content-type']).toContain(type);
    });
    and(/^the CSV response should have (\d+) lines$/, (n: string) => {
      const lines = response.text.split('\n');
      expect(lines.length).toBe(parseInt(n, 10));
    });
  });
});
