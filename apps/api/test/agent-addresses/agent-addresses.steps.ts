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
  path.resolve(__dirname, '../../../../packages/bdd/features/agent-addresses/create-address.feature'),
);
const updateFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agent-addresses/update-address.feature'),
);
const deleteFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agent-addresses/delete-address.feature'),
);
const listFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agent-addresses/list-addresses.feature'),
);
const embeddedFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agent-addresses/agent-addresses-embedded.feature'),
);
const cascadeFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agent-addresses/cascade-delete-on-agent.feature'),
);

const NON_UUID = '00000000-0000-0000-0000-000000000000';

interface Ctx {
  authCookie: string;
  response: request.Response;
  agentIds: Map<string, string>;
  geographyIds: Map<string, string>;
  addressIdsByAgent: Map<string, Map<string, string>>;
}

function newCtx(): Ctx {
  return {
    authCookie: '',
    response: undefined as unknown as request.Response,
    agentIds: new Map(),
    geographyIds: new Map(),
    addressIdsByAgent: new Map(),
  };
}

async function ensureCountry(ctx: Ctx, name: string, code: string) {
  if (ctx.geographyIds.has(name)) return ctx.geographyIds.get(name)!;
  let planetId = ctx.geographyIds.get('Earth');
  if (!planetId) {
    const res = await request(getApp().getHttpServer())
      .post('/geographies')
      .set('Cookie', [ctx.authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ name: 'Earth', code: 'EARTH', type: 'planet' });
    planetId = res.body.id;
    ctx.geographyIds.set('Earth', planetId!);
  }
  let continentId = ctx.geographyIds.get('Europe');
  if (!continentId) {
    const res = await request(getApp().getHttpServer())
      .post('/geographies')
      .set('Cookie', [ctx.authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ name: 'Europe', code: 'EU', type: 'continent', parentId: planetId });
    continentId = res.body.id;
    ctx.geographyIds.set('Europe', continentId!);
  }
  const res = await request(getApp().getHttpServer())
    .post('/geographies')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, code, type: 'country', parentId: continentId });
  ctx.geographyIds.set(name, res.body.id);
  return res.body.id;
}

async function ensureContinent(ctx: Ctx, name: string, code: string) {
  if (ctx.geographyIds.has(name)) return ctx.geographyIds.get(name)!;
  let planetId = ctx.geographyIds.get('Earth');
  if (!planetId) {
    const res = await request(getApp().getHttpServer())
      .post('/geographies')
      .set('Cookie', [ctx.authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ name: 'Earth', code: 'EARTH', type: 'planet' });
    planetId = res.body.id;
    ctx.geographyIds.set('Earth', planetId!);
  }
  const res = await request(getApp().getHttpServer())
    .post('/geographies')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, code, type: 'continent', parentId: planetId });
  ctx.geographyIds.set(name, res.body.id);
  return res.body.id;
}

async function ensureAgent(ctx: Ctx, name: string, type: string) {
  if (ctx.agentIds.has(name)) return ctx.agentIds.get(name)!;
  const res = await request(getApp().getHttpServer())
    .post('/agents')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type, purpose: 'sample' });
  ctx.agentIds.set(name, res.body.id);
  return res.body.id;
}

async function createAddressFor(
  ctx: Ctx,
  agentName: string,
  label: string,
  countryName: string,
  line1: string,
  isPrimary = false,
) {
  const agentId = ctx.agentIds.get(agentName)!;
  const countryId = ctx.geographyIds.get(countryName)!;
  const res = await request(getApp().getHttpServer())
    .post(`/agents/${agentId}/addresses`)
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({
      label,
      line1,
      city: 'City',
      postalCode: '00-001',
      countryId,
      isPrimary,
    });
  let map = ctx.addressIdsByAgent.get(agentName);
  if (!map) {
    map = new Map();
    ctx.addressIdsByAgent.set(agentName, map);
  }
  map.set(label, res.body.id);
  return res.body;
}

type StepFn = (rx: RegExp | string, fn: (...args: never[]) => unknown | Promise<unknown>) => void;
type Stepper = { given: StepFn; and: StepFn; when: StepFn; then: StepFn };

function registerAuthAgent(s: Stepper, ctx: Ctx) {
  s.given(/^I am authenticated as "(.*)"$/, async (email: string) => {
    ctx.authCookie = await createAuthenticatedUser(email, 'password123');
  });
  s.and(/^an agent "(.*)" of type "(.*)" exists$/, async (name: string, type: string) => {
    await ensureAgent(ctx, name, type);
  });
}

function registerCountry(s: Stepper, ctx: Ctx) {
  s.and(/^a country "(.*)" with code "(.*)" exists$/, async (name: string, code: string) => {
    await ensureCountry(ctx, name, code);
  });
}

function registerPrimaryAddress(s: Stepper, ctx: Ctx) {
  s.and(
    /^"(.*)" has an address "(.*)" in "(.*)" with line1 "(.*)" marked primary$/,
    async (agent: string, label: string, country: string, line1: string) => {
      await createAddressFor(ctx, agent, label, country, line1, true);
    },
  );
}

function registerNonPrimaryAddress(s: Stepper, ctx: Ctx) {
  s.and(
    /^"(.*)" has an address "(.*)" in "(.*)" with line1 "(.*)"$/,
    async (agent: string, label: string, country: string, line1: string) => {
      await createAddressFor(ctx, agent, label, country, line1, false);
    },
  );
}

function registerStatus(s: Stepper, ctx: Ctx) {
  s.then(/^the response status should be (\d+)$/, (status: string) => {
    expect(ctx.response.status).toBe(parseInt(status));
  });
}

/* ----------------- CREATE ADDRESS ----------------- */
defineFeature(createFeature, (test) => {
  const ctx = newCtx();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => {
    await cleanDatabase();
    ctx.agentIds.clear();
    ctx.geographyIds.clear();
    ctx.addressIdsByAgent.clear();
    ctx.response = undefined as unknown as request.Response;
  });
  afterAll(async () => { await teardownApp(); });

  test('Successfully add an address to an agent', ({ given, and, when, then }) => {
    const s: Stepper = { given, and, when, then };
    registerAuthAgent(s, ctx);
    registerCountry(s, ctx);
    when('I add an address to "Acme Corp" with:', async (table: Record<string, string>[]) => {
      const row = table[0];
      const agentId = ctx.agentIds.get('Acme Corp')!;
      const countryId = ctx.geographyIds.get(row.country)!;
      const body: Record<string, unknown> = {
        line1: row.line1,
        city: row.city,
        postalCode: row.postalCode,
        countryId,
      };
      if (row.label) body.label = row.label;
      if (row.line2) body.line2 = row.line2;
      if (row.region) body.region = row.region;
      if (row.isPrimary) body.isPrimary = row.isPrimary === 'true';
      ctx.response = await request(getApp().getHttpServer())
        .post(`/agents/${agentId}/addresses`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1')
        .send(body);
    });
    registerStatus(s, ctx);
    and(/^the response should contain an address with line1 "(.*)"$/, (line1: string) => {
      expect(ctx.response.body.line1).toBe(line1);
    });
    and(/^the response should contain an address with isPrimary (true|false)$/, (v: string) => {
      expect(ctx.response.body.isPrimary).toBe(v === 'true');
    });
    and(/^the response should contain an address whose country code is "(.*)"$/, (code: string) => {
      expect(ctx.response.body.country.code).toBe(code);
    });
  });

  test('Address creation fails when line1 is missing', ({ given, and, when, then }) => {
    const s: Stepper = { given, and, when, then };
    registerAuthAgent(s, ctx);
    registerCountry(s, ctx);
    when('I add an address to "Acme Corp" with:', async (table: Record<string, string>[]) => {
      const row = table[0];
      const agentId = ctx.agentIds.get('Acme Corp')!;
      const countryId = ctx.geographyIds.get(row.country)!;
      ctx.response = await request(getApp().getHttpServer())
        .post(`/agents/${agentId}/addresses`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          line1: row.line1,
          city: row.city,
          postalCode: row.postalCode,
          countryId,
        });
    });
    registerStatus(s, ctx);
  });

  test('Address creation fails when the agent does not exist', ({ given, and, when, then }) => {
    const s: Stepper = { given, and, when, then };
    registerAuthAgent(s, ctx);
    registerCountry(s, ctx);
    when('I add an address to a nonexistent agent with:', async (table: Record<string, string>[]) => {
      const row = table[0];
      const countryId = ctx.geographyIds.get(row.country)!;
      ctx.response = await request(getApp().getHttpServer())
        .post(`/agents/${NON_UUID}/addresses`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          line1: row.line1,
          city: row.city,
          postalCode: row.postalCode,
          countryId,
        });
    });
    registerStatus(s, ctx);
  });

  test('Address creation rejects a non-country geography', ({ given, and, when, then }) => {
    const s: Stepper = { given, and, when, then };
    registerAuthAgent(s, ctx);
    registerCountry(s, ctx);
    and(/^a continent "(.*)" with code "(.*)" exists$/, async (name: string, code: string) => {
      await ensureContinent(ctx, name, code);
    });
    when(
      'I add an address to "Acme Corp" using "Europe" as country with:',
      async (table: Record<string, string>[]) => {
        const row = table[0];
        const agentId = ctx.agentIds.get('Acme Corp')!;
        const countryId = ctx.geographyIds.get('Europe')!;
        ctx.response = await request(getApp().getHttpServer())
          .post(`/agents/${agentId}/addresses`)
          .set('Cookie', [ctx.authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            line1: row.line1,
            city: row.city,
            postalCode: row.postalCode,
            countryId,
          });
      },
    );
    registerStatus(s, ctx);
  });
});

/* ----------------- UPDATE ADDRESS ----------------- */
defineFeature(updateFeature, (test) => {
  const ctx = newCtx();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => {
    await cleanDatabase();
    ctx.agentIds.clear();
    ctx.geographyIds.clear();
    ctx.addressIdsByAgent.clear();
    ctx.response = undefined as unknown as request.Response;
  });
  afterAll(async () => { await teardownApp(); });

  // Background:  auth, agent, country (PL), country (DE), primary HQ, non-primary Berlin

  test('Update address fields', ({ given, and, when, then }) => {
    const s: Stepper = { given, and, when, then };
    registerAuthAgent(s, ctx);
    registerCountry(s, ctx); // Poland
    registerCountry(s, ctx); // Germany
    registerPrimaryAddress(s, ctx);
    registerNonPrimaryAddress(s, ctx);
    when(
      'I update the "Berlin" address of "Acme Corp" with:',
      async (table: Record<string, string>[]) => {
        const row = table[0];
        const agentId = ctx.agentIds.get('Acme Corp')!;
        const addressId = ctx.addressIdsByAgent.get('Acme Corp')!.get('Berlin')!;
        ctx.response = await request(getApp().getHttpServer())
          .patch(`/agents/${agentId}/addresses/${addressId}`)
          .set('Cookie', [ctx.authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ label: row.label });
      },
    );
    registerStatus(s, ctx);
    and(/^the response should contain an address with label "(.*)"$/, (label: string) => {
      expect(ctx.response.body.label).toBe(label);
    });
  });

  test('Set a non-primary address as primary clears the sibling flag', ({ given, and, when, then }) => {
    const s: Stepper = { given, and, when, then };
    registerAuthAgent(s, ctx);
    registerCountry(s, ctx); // Poland
    registerCountry(s, ctx); // Germany
    registerPrimaryAddress(s, ctx);
    registerNonPrimaryAddress(s, ctx);
    when(
      'I update the "Berlin" address of "Acme Corp" with:',
      async (table: Record<string, string>[]) => {
        const row = table[0];
        const agentId = ctx.agentIds.get('Acme Corp')!;
        const addressId = ctx.addressIdsByAgent.get('Acme Corp')!.get('Berlin')!;
        ctx.response = await request(getApp().getHttpServer())
          .patch(`/agents/${agentId}/addresses/${addressId}`)
          .set('Cookie', [ctx.authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ isPrimary: row.isPrimary === 'true' });
      },
    );
    registerStatus(s, ctx);
    and(/^the "(.*)" address of "(.*)" should be primary$/, async (label: string, agent: string) => {
      const agentId = ctx.agentIds.get(agent)!;
      const id = ctx.addressIdsByAgent.get(agent)!.get(label)!;
      const res = await request(getApp().getHttpServer())
        .get(`/agents/${agentId}/addresses/${id}`)
        .set('Cookie', [ctx.authCookie]);
      expect(res.body.isPrimary).toBe(true);
    });
    and(/^the "(.*)" address of "(.*)" should not be primary$/, async (label: string, agent: string) => {
      const agentId = ctx.agentIds.get(agent)!;
      const id = ctx.addressIdsByAgent.get(agent)!.get(label)!;
      const res = await request(getApp().getHttpServer())
        .get(`/agents/${agentId}/addresses/${id}`)
        .set('Cookie', [ctx.authCookie]);
      expect(res.body.isPrimary).toBe(false);
    });
  });

  test('Update with invalid country fails', ({ given, and, when, then }) => {
    const s: Stepper = { given, and, when, then };
    registerAuthAgent(s, ctx);
    registerCountry(s, ctx); // Poland
    registerCountry(s, ctx); // Germany
    registerPrimaryAddress(s, ctx);
    registerNonPrimaryAddress(s, ctx);
    and(/^a continent "(.*)" with code "(.*)" exists$/, async (name: string, code: string) => {
      await ensureContinent(ctx, name, code);
    });
    when(
      /^I update the "(.*)" address of "(.*)" with country "(.*)"$/,
      async (label: string, agent: string, countryName: string) => {
        const agentId = ctx.agentIds.get(agent)!;
        const addressId = ctx.addressIdsByAgent.get(agent)!.get(label)!;
        const countryId = ctx.geographyIds.get(countryName)!;
        ctx.response = await request(getApp().getHttpServer())
          .patch(`/agents/${agentId}/addresses/${addressId}`)
          .set('Cookie', [ctx.authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ countryId });
      },
    );
    registerStatus(s, ctx);
  });

  test('Update a nonexistent address returns 404', ({ given, and, when, then }) => {
    const s: Stepper = { given, and, when, then };
    registerAuthAgent(s, ctx);
    registerCountry(s, ctx); // Poland
    registerCountry(s, ctx); // Germany
    registerPrimaryAddress(s, ctx);
    registerNonPrimaryAddress(s, ctx);
    when(
      'I update a nonexistent address of "Acme Corp" with:',
      async (table: Record<string, string>[]) => {
        const row = table[0];
        const agentId = ctx.agentIds.get('Acme Corp')!;
        ctx.response = await request(getApp().getHttpServer())
          .patch(`/agents/${agentId}/addresses/${NON_UUID}`)
          .set('Cookie', [ctx.authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ label: row.label });
      },
    );
    registerStatus(s, ctx);
  });
});

/* ----------------- DELETE ADDRESS ----------------- */
defineFeature(deleteFeature, (test) => {
  const ctx = newCtx();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => {
    await cleanDatabase();
    ctx.agentIds.clear();
    ctx.geographyIds.clear();
    ctx.addressIdsByAgent.clear();
    ctx.response = undefined as unknown as request.Response;
  });
  afterAll(async () => { await teardownApp(); });

  // Background: auth, agent, country PL, country DE

  test('Delete a non-primary address', ({ given, and, when, then }) => {
    const s: Stepper = { given, and, when, then };
    registerAuthAgent(s, ctx);
    registerCountry(s, ctx); // Poland
    registerCountry(s, ctx); // Germany
    registerPrimaryAddress(s, ctx);
    registerNonPrimaryAddress(s, ctx);
    when(/^I delete the "(.*)" address of "(.*)"$/, async (label: string, agent: string) => {
      const agentId = ctx.agentIds.get(agent)!;
      const addressId = ctx.addressIdsByAgent.get(agent)!.get(label)!;
      ctx.response = await request(getApp().getHttpServer())
        .delete(`/agents/${agentId}/addresses/${addressId}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1');
    });
    registerStatus(s, ctx);
    and(/^listing addresses of "(.*)" returns (\d+) address$/, async (agent: string, count: string) => {
      const agentId = ctx.agentIds.get(agent)!;
      const res = await request(getApp().getHttpServer())
        .get(`/agents/${agentId}/addresses`)
        .set('Cookie', [ctx.authCookie]);
      expect(res.body.length).toBe(parseInt(count));
    });
  });

  test('Deleting the primary auto-promotes the most recent sibling at read time', ({ given, and, when, then }) => {
    const s: Stepper = { given, and, when, then };
    registerAuthAgent(s, ctx);
    registerCountry(s, ctx); // Poland
    registerCountry(s, ctx); // Germany
    registerPrimaryAddress(s, ctx);
    registerNonPrimaryAddress(s, ctx);
    when(/^I delete the "(.*)" address of "(.*)"$/, async (label: string, agent: string) => {
      const agentId = ctx.agentIds.get(agent)!;
      const addressId = ctx.addressIdsByAgent.get(agent)!.get(label)!;
      ctx.response = await request(getApp().getHttpServer())
        .delete(`/agents/${agentId}/addresses/${addressId}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1');
    });
    and(/^I list addresses of "(.*)"$/, async (agent: string) => {
      const agentId = ctx.agentIds.get(agent)!;
      ctx.response = await request(getApp().getHttpServer())
        .get(`/agents/${agentId}/addresses`)
        .set('Cookie', [ctx.authCookie]);
    });
    registerStatus(s, ctx);
    and(/^the first address should be "(.*)"$/, (label: string) => {
      expect(ctx.response.body[0].label).toBe(label);
    });
    and(/^the first address should be primary$/, () => {
      expect(ctx.response.body[0].isPrimary).toBe(true);
    });
  });
});

/* ----------------- LIST ADDRESSES ----------------- */
defineFeature(listFeature, (test) => {
  const ctx = newCtx();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => {
    await cleanDatabase();
    ctx.agentIds.clear();
    ctx.geographyIds.clear();
    ctx.addressIdsByAgent.clear();
    ctx.response = undefined as unknown as request.Response;
  });
  afterAll(async () => { await teardownApp(); });

  // Background: auth, agent, country PL, country DE

  test('An agent with no addresses', ({ given, and, when, then }) => {
    const s: Stepper = { given, and, when, then };
    registerAuthAgent(s, ctx);
    registerCountry(s, ctx); // Poland
    registerCountry(s, ctx); // Germany
    when(/^I list addresses of "(.*)"$/, async (agent: string) => {
      const agentId = ctx.agentIds.get(agent)!;
      ctx.response = await request(getApp().getHttpServer())
        .get(`/agents/${agentId}/addresses`)
        .set('Cookie', [ctx.authCookie]);
    });
    registerStatus(s, ctx);
    and(/^the response should contain (\d+) address(?:es)?$/, (count: string) => {
      expect(ctx.response.body.length).toBe(parseInt(count));
    });
  });

  test('An agent with a single address', ({ given, and, when, then }) => {
    const s: Stepper = { given, and, when, then };
    registerAuthAgent(s, ctx);
    registerCountry(s, ctx); // Poland
    registerCountry(s, ctx); // Germany
    registerNonPrimaryAddress(s, ctx);
    when(/^I list addresses of "(.*)"$/, async (agent: string) => {
      const agentId = ctx.agentIds.get(agent)!;
      ctx.response = await request(getApp().getHttpServer())
        .get(`/agents/${agentId}/addresses`)
        .set('Cookie', [ctx.authCookie]);
    });
    registerStatus(s, ctx);
    and(/^the response should contain (\d+) address(?:es)?$/, (count: string) => {
      expect(ctx.response.body.length).toBe(parseInt(count));
    });
    and(/^the first address should be primary$/, () => {
      expect(ctx.response.body[0].isPrimary).toBe(true);
    });
  });

  test('Multiple addresses are ordered with the primary first', ({ given, and, when, then }) => {
    const s: Stepper = { given, and, when, then };
    registerAuthAgent(s, ctx);
    registerCountry(s, ctx); // Poland
    registerCountry(s, ctx); // Germany
    registerNonPrimaryAddress(s, ctx); // Berlin (declared first in feature)
    registerPrimaryAddress(s, ctx);    // HQ (declared after)
    when(/^I list addresses of "(.*)"$/, async (agent: string) => {
      const agentId = ctx.agentIds.get(agent)!;
      ctx.response = await request(getApp().getHttpServer())
        .get(`/agents/${agentId}/addresses`)
        .set('Cookie', [ctx.authCookie]);
    });
    registerStatus(s, ctx);
    and(/^the response should contain (\d+) address(?:es)?$/, (count: string) => {
      expect(ctx.response.body.length).toBe(parseInt(count));
    });
    and(/^the first address should be "(.*)"$/, (label: string) => {
      expect(ctx.response.body[0].label).toBe(label);
    });
  });
});

/* ----------------- EMBEDDED ADDRESSES ----------------- */
defineFeature(embeddedFeature, (test) => {
  const ctx = newCtx();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => {
    await cleanDatabase();
    ctx.agentIds.clear();
    ctx.geographyIds.clear();
    ctx.addressIdsByAgent.clear();
    ctx.response = undefined as unknown as request.Response;
  });
  afterAll(async () => { await teardownApp(); });

  // Background: auth, agent, country PL, non-primary address

  test('GET /agents/:id embeds the sorted addresses', ({ given, and, when, then }) => {
    const s: Stepper = { given, and, when, then };
    registerAuthAgent(s, ctx);
    registerCountry(s, ctx);
    registerNonPrimaryAddress(s, ctx);
    when(/^I fetch the agent "(.*)"$/, async (name: string) => {
      const id = ctx.agentIds.get(name)!;
      ctx.response = await request(getApp().getHttpServer())
        .get(`/agents/${id}`)
        .set('Cookie', [ctx.authCookie]);
    });
    registerStatus(s, ctx);
    and(/^the agent should have (\d+) embedded address$/, (count: string) => {
      expect(ctx.response.body.addresses.length).toBe(parseInt(count));
    });
    and(/^the first embedded address country code should be "(.*)"$/, (code: string) => {
      expect(ctx.response.body.addresses[0].country.code).toBe(code);
    });
  });

  test('GET /agents list also embeds addresses', ({ given, and, when, then }) => {
    const s: Stepper = { given, and, when, then };
    registerAuthAgent(s, ctx);
    registerCountry(s, ctx);
    registerNonPrimaryAddress(s, ctx);
    when('I list agents', async () => {
      ctx.response = await request(getApp().getHttpServer())
        .get('/agents')
        .set('Cookie', [ctx.authCookie]);
    });
    registerStatus(s, ctx);
    and(/^the "(.*)" entry should embed (\d+) address$/, (name: string, count: string) => {
      const entry = ctx.response.body.data.find((a: { name: string }) => a.name === name);
      expect(entry).toBeDefined();
      expect(entry.addresses.length).toBe(parseInt(count));
    });
  });
});

/* ----------------- CASCADE DELETE ON AGENT ----------------- */
defineFeature(cascadeFeature, (test) => {
  const ctx = newCtx();

  beforeAll(async () => { await bootstrapApp(); });
  beforeEach(async () => {
    await cleanDatabase();
    ctx.agentIds.clear();
    ctx.geographyIds.clear();
    ctx.addressIdsByAgent.clear();
    ctx.response = undefined as unknown as request.Response;
  });
  afterAll(async () => { await teardownApp(); });

  test('Deleting an agent removes its addresses', ({ given, and, when, then }) => {
    const s: Stepper = { given, and, when, then };
    registerAuthAgent(s, ctx);
    registerCountry(s, ctx);
    registerNonPrimaryAddress(s, ctx);
    when(/^I delete the agent "(.*)"$/, async (name: string) => {
      const id = ctx.agentIds.get(name)!;
      ctx.response = await request(getApp().getHttpServer())
        .delete(`/agents/${id}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1');
    });
    registerStatus(s, ctx);
    and('no address rows remain in the database', async () => {
      const agentId = ctx.agentIds.get('Acme Corp')!;
      const res = await request(getApp().getHttpServer())
        .get(`/agents/${agentId}/addresses`)
        .set('Cookie', [ctx.authCookie]);
      expect(res.status).toBe(404);
    });
  });
});
