import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import {
  bootstrapApp,
  cleanDatabase,
  teardownApp,
  getApp,
  createAuthenticatedUser,
  createUserWithRoles,
} from '../setup';

const protocolFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/mcp/protocol.feature'),
);
const authenticationFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/mcp/authentication.feature'),
);
const toolListingFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/mcp/tool-listing.feature'),
);
const toolCallsFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/mcp/tool-calls.feature'),
);
const toolErrorsFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/mcp/tool-errors.feature'),
);

// The Streamable HTTP transport requires clients to accept both content types.
const MCP_ACCEPT = 'application/json, text/event-stream';

interface Ctx {
  response: request.Response;
  adminCookie: string;
  apiKey: string;
  actorIds: Map<string, string>;
  valueIds: Map<string, string>;
  invoiceIds: Map<string, string>;
  orderId: string;
  scopedCookie?: string;
}

const ctx: Ctx = {
  response: undefined as unknown as request.Response,
  adminCookie: '',
  apiKey: '',
  actorIds: new Map(),
  valueIds: new Map(),
  invoiceIds: new Map(),
  orderId: '',
};

let rpcId = 0;

function resetCtx() {
  ctx.response = undefined as unknown as request.Response;
  ctx.adminCookie = '';
  ctx.apiKey = '';
  ctx.actorIds.clear();
  ctx.valueIds.clear();
  ctx.invoiceIds.clear();
  ctx.orderId = '';
}

function mcpPost(payload: Record<string, unknown>): request.Test {
  // X-CSRF-Protection bypasses the global CSRF guard for requests without an
  // Authorization header, so the auth scenarios observe the 401 from the MCP
  // guard rather than the CSRF 403. Real MCP clients always send a Bearer key,
  // which is CSRF-immune on its own.
  return request(getApp().getHttpServer())
    .post('/mcp')
    .set('Accept', MCP_ACCEPT)
    .set('Content-Type', 'application/json')
    .set('X-CSRF-Protection', '1')
    .send(payload);
}

function rpc(method: string, params?: Record<string, unknown>): Record<string, unknown> {
  rpcId += 1;
  return { jsonrpc: '2.0', id: rpcId, method, ...(params ? { params } : {}) };
}

async function sendMcp(
  method: string,
  params?: Record<string, unknown>,
  apiKey?: string,
): Promise<request.Response> {
  let req = mcpPost(rpc(method, params));
  if (apiKey) req = req.set('Authorization', `Bearer ${apiKey}`);
  return req;
}

async function callTool(name: string, args: Record<string, unknown>): Promise<void> {
  ctx.response = await sendMcp('tools/call', { name, arguments: args }, ctx.apiKey);
}

function toolResult(): { content: { type: string; text: string }[]; isError?: boolean } {
  return ctx.response.body.result;
}

function toolResultJson(): unknown {
  return JSON.parse(toolResult().content[0].text);
}

async function createOwnApiKey(cookie: string, name: string): Promise<string> {
  const res = await request(getApp().getHttpServer())
    .post('/api-keys')
    .set('Cookie', [cookie])
    .set('X-CSRF-Protection', '1')
    .send({ name });
  return res.body.key;
}

async function adminPost(pathname: string, body: Record<string, unknown>): Promise<request.Response> {
  return request(getApp().getHttpServer())
    .post(pathname)
    .set('Cookie', [ctx.adminCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
}

async function adminGet(pathname: string): Promise<request.Response> {
  return request(getApp().getHttpServer()).get(pathname).set('Cookie', [ctx.adminCookie]);
}

async function createActorFixture(name: string): Promise<string> {
  const res = await adminPost('/actors', { name, type: 'organization' });
  ctx.actorIds.set(name, res.body.id);
  return res.body.id;
}

async function createCurrencyValue(name: string): Promise<string> {
  const res = await adminPost('/values', { name, type: 'currency' });
  ctx.valueIds.set(name, res.body.id);
  return res.body.id;
}

async function createInvoiceFixture(number: string, fromName: string, toName: string): Promise<void> {
  const fromActorId = ctx.actorIds.get(fromName) ?? (await createActorFixture(fromName));
  const toActorId = ctx.actorIds.get(toName) ?? (await createActorFixture(toName));
  const currencyId = ctx.valueIds.get('USD') ?? (await createCurrencyValue('USD'));
  const res = await adminPost('/invoices', {
    number,
    fromActorId,
    toActorId,
    issuedAt: '2025-01-15T00:00:00.000Z',
    dueAt: '2025-02-15T00:00:00.000Z',
    currencyId,
  });
  expect(res.status).toBe(201);
  ctx.invoiceIds.set(number, res.body.id);
}

async function createOrderFixture(fromName: string, toName: string): Promise<void> {
  const fromActorId = ctx.actorIds.get(fromName) ?? (await createActorFixture(fromName));
  const toActorId = ctx.actorIds.get(toName) ?? (await createActorFixture(toName));
  const currencyId = ctx.valueIds.get('USD') ?? (await createCurrencyValue('USD'));
  const res = await adminPost('/orders', { fromActorId, toActorId, currencyId });
  expect(res.status).toBe(201);
  ctx.orderId = res.body.id;
}

async function createScopedUserWithKey(email: string, permissionsCsv: string): Promise<void> {
  const permissions = permissionsCsv.split(',').map((p) => p.trim());
  const { cookie } = await createUserWithRoles(email, 'password123', [
    { code: `mcp_test_${email.split('@')[0]}`, permissions },
  ]);
  ctx.adminCookie = ctx.adminCookie || cookie;
  ctx.scopedCookie = cookie;
}

function expectStatusStep(then: (matcher: RegExp, fn: (status: string) => void) => void) {
  then(/^the response status should be (\d+)$/, (status: string) => {
    expect(ctx.response.status).toBe(parseInt(status, 10));
  });
}

function authBackground(
  given: (matcher: RegExp, fn: (email: string) => Promise<void>) => void,
  and: (matcher: RegExp, fn: (name: string) => Promise<void>) => void,
) {
  given(/^I am authenticated as "(.*)"$/, async (email: string) => {
    ctx.adminCookie = await createAuthenticatedUser(email, 'password123');
  });
  and(/^I have created an API key named "(.*)"$/, async (name: string) => {
    ctx.apiKey = await createOwnApiKey(ctx.adminCookie, name);
  });
}

async function expectToolResultEqualsRest(restPath: string): Promise<void> {
  const rest = await adminGet(restPath);
  expect(rest.status).toBe(200);
  expect(toolResultJson()).toEqual(rest.body);
}

function expectToolSuccess() {
  expect(ctx.response.status).toBe(200);
  expect(ctx.response.body.error).toBeUndefined();
  expect(toolResult().isError).toBeFalsy();
}

function expectToolFailure(code: string) {
  expect(ctx.response.status).toBe(200);
  expect(toolResult().isError).toBe(true);
  const payload = toolResultJson() as { code: string; message: string };
  expect(payload.code).toBe(code);
  expect(typeof payload.message).toBe('string');
}

// --- PROTOCOL ---
defineFeature(protocolFeature, (test) => {
  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    resetCtx();
  });
  afterAll(async () => {
    await teardownApp();
  });

  test('An MCP client can initialize against the server', ({ given, and, when, then }) => {
    authBackground(given, and);
    when('I send an MCP "initialize" request using the API key', async () => {
      ctx.response = await sendMcp(
        'initialize',
        {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'bdd-test', version: '1.0.0' },
        },
        ctx.apiKey,
      );
    });
    expectStatusStep(then);
    and(/^the MCP result should identify the server as "(.*)"$/, (name: string) => {
      expect(ctx.response.body.result.serverInfo.name).toBe(name);
      expect(typeof ctx.response.body.result.protocolVersion).toBe('string');
      expect(ctx.response.body.result.capabilities.tools).toBeDefined();
    });
  });

  test('An unknown JSON-RPC method returns a method-not-found error', ({ given, and, when, then }) => {
    authBackground(given, and);
    when(/^I send an MCP request with method "(.*)" using the API key$/, async (method: string) => {
      ctx.response = await sendMcp(method, undefined, ctx.apiKey);
    });
    expectStatusStep(then);
    and(/^the response should be a JSON-RPC error with code (-?\d+)$/, (code: string) => {
      expect(ctx.response.body.error.code).toBe(parseInt(code, 10));
    });
  });

  test('The MCP endpoint does not support GET', ({ when, then }) => {
    when('I send a GET request to the MCP endpoint', async () => {
      ctx.response = await request(getApp().getHttpServer()).get('/mcp').set('Accept', MCP_ACCEPT);
    });
    expectStatusStep(then);
  });
});

// --- AUTHENTICATION ---
defineFeature(authenticationFeature, (test) => {
  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    resetCtx();
  });
  afterAll(async () => {
    await teardownApp();
  });

  test('A request without an API key is rejected', ({ when, then }) => {
    when('I send an MCP "tools/list" request without credentials', async () => {
      ctx.response = await sendMcp('tools/list');
    });
    expectStatusStep(then);
  });

  test('A request with an unknown API key is rejected', ({ when, then }) => {
    when(/^I send an MCP "tools\/list" request with the API key "(.*)"$/, async (key: string) => {
      ctx.response = await sendMcp('tools/list', undefined, key);
    });
    expectStatusStep(then);
  });

  test('A session cookie cannot authenticate the MCP endpoint', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      ctx.adminCookie = await createAuthenticatedUser(email, 'password123');
    });
    when('I send an MCP "tools/list" request using my session cookie', async () => {
      ctx.response = await mcpPost(rpc('tools/list')).set('Cookie', [ctx.adminCookie]);
    });
    expectStatusStep(then);
  });
});

// --- TOOL LISTING ---
defineFeature(toolListingFeature, (test) => {
  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    resetCtx();
  });
  afterAll(async () => {
    await teardownApp();
  });

  function listTools(when: (matcher: string, fn: () => Promise<void>) => void) {
    when('I list the MCP tools using the API key', async () => {
      ctx.response = await sendMcp('tools/list', undefined, ctx.apiKey);
    });
  }

  function toolNames(): string[] {
    return ctx.response.body.result.tools.map((t: { name: string }) => t.name);
  }

  test('An administrator sees the full tool catalog', ({ given, and, when, then }) => {
    authBackground(given, and);
    listTools(when);
    then(/^the MCP tool list should contain exactly (\d+) tools$/, (count: string) => {
      expect(ctx.response.status).toBe(200);
      expect(toolNames()).toHaveLength(parseInt(count, 10));
    });
  });

  test('A scoped role sees only the tools its permissions allow', ({ given, and, when, then }) => {
    given(/^a user "(.*)" with a role granting "(.*)"$/, async (email: string, perms: string) => {
      await createScopedUserWithKey(email, perms);
    });
    and(/^that user has created an API key named "(.*)"$/, async (name: string) => {
      ctx.apiKey = await createOwnApiKey(ctx.scopedCookie!, name);
    });
    listTools(when);
    then(/^the MCP tool list should be exactly "(.*)"$/, (names: string) => {
      expect(ctx.response.status).toBe(200);
      expect(toolNames()).toEqual(names.split(',').map((n) => n.trim()));
    });
  });

  test('A user with no read permissions sees no tools', ({ given, and, when, then }) => {
    given(/^a user "(.*)" with a role granting "(.*)"$/, async (email: string, perms: string) => {
      await createScopedUserWithKey(email, perms);
    });
    and(/^that user has created an API key named "(.*)"$/, async (name: string) => {
      ctx.apiKey = await createOwnApiKey(ctx.scopedCookie!, name);
    });
    listTools(when);
    then('the MCP tool list should be empty', () => {
      expect(ctx.response.status).toBe(200);
      expect(toolNames()).toEqual([]);
    });
  });
});

// --- TOOL CALLS ---
defineFeature(toolCallsFeature, (test) => {
  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    resetCtx();
  });
  afterAll(async () => {
    await teardownApp();
  });

  function callToolWithDocstring(when: (matcher: RegExp, fn: (name: string, doc: string) => Promise<void>) => void) {
    when(/^I call the MCP tool "(.*)" with arguments:$/, async (name: string, doc: string) => {
      await callTool(name, JSON.parse(doc));
    });
  }

  function successStep(then: (matcher: string, fn: () => void) => void) {
    then('the tool call should succeed', () => {
      expectToolSuccess();
    });
  }

  test('search_market returns the same payload as the REST search endpoint', ({ given, and, when, then }) => {
    authBackground(given, and);
    given(/^an actor named "(.*)" exists$/, async (name: string) => {
      await createActorFixture(name);
    });
    callToolWithDocstring(when);
    successStep(then);
    and(/^the tool result should equal the REST response for "(.*)"$/, async (restPath: string) => {
      await expectToolResultEqualsRest(restPath);
    });
  });

  test('search_actors returns the same payload as the REST actors list', ({ given, and, when, then }) => {
    authBackground(given, and);
    given(/^an actor named "(.*)" exists$/, async (name: string) => {
      await createActorFixture(name);
    });
    and(/^an actor named "(.*)" exists$/, async (name: string) => {
      await createActorFixture(name);
    });
    callToolWithDocstring(when);
    successStep(then);
    and(/^the tool result should equal the REST response for "(.*)"$/, async (restPath: string) => {
      await expectToolResultEqualsRest(restPath);
    });
  });

  test('get_actor returns the same payload as the REST actor detail', ({ given, and, when, then }) => {
    authBackground(given, and);
    given(/^an actor named "(.*)" exists$/, async (name: string) => {
      await createActorFixture(name);
    });
    when(/^I call the MCP tool "(.*)" with the id of actor "(.*)"$/, async (tool: string, actorName: string) => {
      await callTool(tool, { id: ctx.actorIds.get(actorName)! });
    });
    successStep(then);
    and(/^the tool result should equal the REST response for the detail of actor "(.*)"$/, async (actorName: string) => {
      await expectToolResultEqualsRest(`/actors/${ctx.actorIds.get(actorName)!}`);
    });
  });

  test('get_actor_financials returns the same payload as the REST actor financials', ({ given, and, when, then }) => {
    authBackground(given, and);
    given(/^an actor named "(.*)" exists$/, async (name: string) => {
      await createActorFixture(name);
    });
    when(/^I call the MCP tool "(.*)" for actor "(.*)" and year (\d+)$/, async (tool: string, actorName: string, year: string) => {
      await callTool(tool, { actorId: ctx.actorIds.get(actorName)!, year: parseInt(year, 10) });
    });
    successStep(then);
    and(/^the tool result should equal the REST response for the (\d+) financials of actor "(.*)"$/, async (year: string, actorName: string) => {
      await expectToolResultEqualsRest(`/actors/${ctx.actorIds.get(actorName)!}/financials?year=${year}`);
    });
  });

  test('search_invoices returns the same payload as the REST invoice search', ({ given, and, when, then }) => {
    authBackground(given, and);
    given(/^an invoice "(.*)" from "(.*)" to "(.*)" exists$/, async (number: string, from: string, to: string) => {
      await createInvoiceFixture(number, from, to);
    });
    callToolWithDocstring(when);
    successStep(then);
    and(/^the tool result should equal the REST response for "(.*)"$/, async (restPath: string) => {
      await expectToolResultEqualsRest(restPath);
    });
  });

  test('get_invoice returns the same payload as the REST invoice detail', ({ given, and, when, then }) => {
    authBackground(given, and);
    given(/^an invoice "(.*)" from "(.*)" to "(.*)" exists$/, async (number: string, from: string, to: string) => {
      await createInvoiceFixture(number, from, to);
    });
    when(/^I call the MCP tool "(.*)" with the id of invoice "(.*)"$/, async (tool: string, number: string) => {
      await callTool(tool, { id: ctx.invoiceIds.get(number)! });
    });
    successStep(then);
    and(/^the tool result should equal the REST response for the detail of invoice "(.*)"$/, async (number: string) => {
      await expectToolResultEqualsRest(`/invoices/${ctx.invoiceIds.get(number)!}`);
    });
  });

  test('search_orders returns the same payload as the REST order search', ({ given, and, when, then }) => {
    authBackground(given, and);
    given(/^an order from "(.*)" to "(.*)" exists$/, async (from: string, to: string) => {
      await createOrderFixture(from, to);
    });
    callToolWithDocstring(when);
    successStep(then);
    and(/^the tool result should equal the REST response for "(.*)"$/, async (restPath: string) => {
      await expectToolResultEqualsRest(restPath);
    });
  });

  test('get_order returns the same payload as the REST order detail', ({ given, and, when, then }) => {
    authBackground(given, and);
    given(/^an order from "(.*)" to "(.*)" exists$/, async (from: string, to: string) => {
      await createOrderFixture(from, to);
    });
    when(/^I call the MCP tool "(.*)" with the id of that order$/, async (tool: string) => {
      await callTool(tool, { id: ctx.orderId });
    });
    successStep(then);
    and('the tool result should equal the REST response for the detail of that order', async () => {
      await expectToolResultEqualsRest(`/orders/${ctx.orderId}`);
    });
  });

  test('list_value_streams returns the same payload as the REST value-stream search', ({ given, and, when, then }) => {
    authBackground(given, and);
    given(/^a value stream named "(.*)" exists$/, async (name: string) => {
      const res = await adminPost('/value-streams', { name, purpose: 'MCP test stream' });
      expect(res.status).toBe(201);
    });
    callToolWithDocstring(when);
    successStep(then);
    and(/^the tool result should equal the REST response for "(.*)"$/, async (restPath: string) => {
      await expectToolResultEqualsRest(restPath);
    });
  });

  test('get_dashboard_summary returns the same payload as the REST dashboard summary', ({ given, and, when, then }) => {
    authBackground(given, and);
    callToolWithDocstring(when);
    successStep(then);
    and(/^the tool result should equal the REST response for "(.*)"$/, async (restPath: string) => {
      await expectToolResultEqualsRest(restPath);
    });
  });

  test('get_exchange_rate returns the same payload as the REST rate lookup', ({ given, and, when, then }) => {
    authBackground(given, and);
    given(
      /^currency values "(.*)" and "(.*)" with an exchange rate of "(.*)" exist$/,
      async (from: string, to: string, rate: string) => {
        const fromValueId = await createCurrencyValue(from);
        const toValueId = await createCurrencyValue(to);
        const res = await adminPost('/exchange-rates', {
          fromValueId,
          toValueId,
          rate,
          effectiveAt: '2025-01-01T00:00:00.000Z',
        });
        expect(res.status).toBe(201);
      },
    );
    when(/^I call the MCP tool "(.*)" for values "(.*)" and "(.*)"$/, async (tool: string, from: string, to: string) => {
      await callTool(tool, {
        fromValueId: ctx.valueIds.get(from)!,
        toValueId: ctx.valueIds.get(to)!,
      });
    });
    successStep(then);
    and(
      /^the tool result should equal the REST response for the rate lookup from "(.*)" to "(.*)"$/,
      async (from: string, to: string) => {
        await expectToolResultEqualsRest(
          `/exchange-rates/lookup?fromValueId=${ctx.valueIds.get(from)!}&toValueId=${ctx.valueIds.get(to)!}`,
        );
      },
    );
  });
});

// --- TOOL ERRORS ---
defineFeature(toolErrorsFeature, (test) => {
  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    resetCtx();
  });
  afterAll(async () => {
    await teardownApp();
  });

  function callToolWithDocstring(when: (matcher: RegExp, fn: (name: string, doc: string) => Promise<void>) => void) {
    when(/^I call the MCP tool "(.*)" with arguments:$/, async (name: string, doc: string) => {
      await callTool(name, JSON.parse(doc));
    });
  }

  function failureStep(then: (matcher: RegExp, fn: (code: string) => void) => void) {
    then(/^the tool call should fail with code "(.*)"$/, (code: string) => {
      expectToolFailure(code);
    });
  }

  test('Calling a tool without its permission returns a FORBIDDEN error', ({ given, and, when, then }) => {
    given(/^a user "(.*)" with a role granting "(.*)"$/, async (email: string, perms: string) => {
      await createScopedUserWithKey(email, perms);
    });
    and(/^that user has created an API key named "(.*)"$/, async (name: string) => {
      ctx.apiKey = await createOwnApiKey(ctx.scopedCookie!, name);
    });
    callToolWithDocstring(when);
    failureStep(then);
  });

  test('Fetching a missing entity returns a NOT_FOUND error', ({ given, and, when, then }) => {
    authBackground(given, and);
    callToolWithDocstring(when);
    failureStep(then);
  });

  test('Invalid tool input returns an INVALID_INPUT error', ({ given, and, when, then }) => {
    authBackground(given, and);
    callToolWithDocstring(when);
    failureStep(then);
  });

  test('A result limit above the maximum is rejected', ({ given, and, when, then }) => {
    authBackground(given, and);
    callToolWithDocstring(when);
    failureStep(then);
  });
});
