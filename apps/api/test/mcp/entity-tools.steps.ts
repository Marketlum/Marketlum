import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { AuditService, RolesService, TaxonomiesService, UsersService } from '@marketlum/core';
import {
  bootstrapApp,
  cleanDatabase,
  teardownApp,
  getApp,
  createAuthenticatedUser,
} from '../setup';

const feature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/mcp/entity-tools.feature'),
);

const MCP_ACCEPT = 'application/json, text/event-stream';
let rpcId = 100;

interface Ctx {
  adminCookie: string;
  apiKey: string;
  agentUserId: string;
  actorIds: string[];
  createdId: string;
  response: request.Response;
}
const ctx = {} as Ctx;

function post(pathname: string, cookie: string, body: Record<string, unknown>) {
  return request(getApp().getHttpServer())
    .post(pathname)
    .set('Cookie', [cookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
}

async function provisionAgentKey(grants: string): Promise<void> {
  ctx.adminCookie = await createAuthenticatedUser('admin@marketlum.com', 'password123');
  const agentRes = await post('/users', ctx.adminCookie, {
    name: 'MCP Writer Bot',
    email: 'mcp-writer@marketlum.com',
    type: 'agent',
  });
  ctx.agentUserId = agentRes.body.id;
  const role = await getApp()
    .get(RolesService)
    .create({
      name: 'MCP Entity Role',
      code: 'mcp_entity_role',
      parentId: null,
      permissions: grants.split(',').map((g) => g.trim()),
    });
  await getApp().get(UsersService).assignRoles(ctx.agentUserId, [role.id]);
  const keyRes = await post(`/users/${ctx.agentUserId}/api-keys`, ctx.adminCookie, {
    name: 'entity-bot-key',
  });
  ctx.apiKey = keyRes.body.key;
}

async function createMarketActors(count: number): Promise<void> {
  ctx.actorIds = [];
  for (let i = 0; i < count; i++) {
    const res = await post('/actors', ctx.adminCookie, {
      name: `MCP Party ${i + 1}`,
      type: 'organization',
    });
    ctx.actorIds.push(res.body.id);
  }
}

async function callTool(name: string, args: Record<string, unknown>): Promise<void> {
  rpcId += 1;
  ctx.response = await request(getApp().getHttpServer())
    .post('/mcp')
    .set('Accept', MCP_ACCEPT)
    .set('Content-Type', 'application/json')
    .set('Authorization', `Bearer ${ctx.apiKey}`)
    .send({ jsonrpc: '2.0', id: rpcId, method: 'tools/call', params: { name, arguments: args } });
}

function toolResultJson(): Record<string, unknown> {
  return JSON.parse(ctx.response.body.result.content[0].text);
}

function expectToolOk(): void {
  expect(ctx.response.status).toBe(200);
  expect(ctx.response.body.result?.isError).toBeFalsy();
}

defineFeature(feature, (test) => {
  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
  });
  afterAll(async () => {
    await teardownApp();
  });

  const givenKey = (given: (m: RegExp, cb: (grants: string) => Promise<void>) => void) => {
    given(/^an MCP API key with grants "(.*)"$/, async (grants: string) => {
      await provisionAgentKey(grants);
    });
  };

  const thenToolOk = (then: (m: string, cb: () => void) => void) => {
    then('the tool call succeeds', () => {
      expectToolOk();
      const result = toolResultJson() as { id?: string };
      if (result.id) ctx.createdId = result.id;
    });
  };

  const createValueStep = (kw: (m: RegExp, cb: (...a: string[]) => Promise<void>) => void) => {
    kw(
      /^the agent calls create_value with code "(.*)", name "(.*)" and type "(.*)"$/,
      async (code: string, name: string, type: string) => {
        await callTool('create_value', { code, name, type });
      },
    );
  };

  test('Create and fetch a value', ({ given, when, then, and }) => {
    givenKey(given);
    createValueStep(when);
    thenToolOk(then);
    and(
      /^the agent can get_value for the created id and sees name "(.*)"$/,
      async (name: string) => {
        await callTool('get_value', { id: ctx.createdId });
        expectToolOk();
        expect((toolResultJson() as { name: string }).name).toBe(name);
      },
    );
  });

  test('Update a value', ({ given, and, when, then }) => {
    givenKey(given);
    and(
      /^the agent created a value with code "(.*)", name "(.*)" and type "(.*)"$/,
      async (code: string, name: string, type: string) => {
        await callTool('create_value', { code, name, type });
        expectToolOk();
        ctx.createdId = (toolResultJson() as { id: string }).id;
      },
    );
    when(/^the agent calls update_value renaming it to "(.*)"$/, async (name: string) => {
      await callTool('update_value', { id: ctx.createdId, name });
    });
    thenToolOk(then);
    and(
      /^the agent can get_value for the created id and sees name "(.*)"$/,
      async (name: string) => {
        await callTool('get_value', { id: ctx.createdId });
        expectToolOk();
        expect((toolResultJson() as { name: string }).name).toBe(name);
      },
    );
  });

  test('Search values', ({ given, and, when, then }) => {
    givenKey(given);
    and(
      /^the agent created a value with code "(.*)", name "(.*)" and type "(.*)"$/,
      async (code: string, name: string, type: string) => {
        await callTool('create_value', { code, name, type });
        expectToolOk();
      },
    );
    when(/^the agent calls search_values searching for "(.*)"$/, async (search: string) => {
      await callTool('search_values', { search });
    });
    thenToolOk(then);
    and(/^the search result envelope contains an entry named "(.*)"$/, (name: string) => {
      const envelope = toolResultJson() as { data: { name: string }[]; meta: unknown };
      expect(envelope.meta).toBeDefined();
      expect(envelope.data.some((v) => v.name === name)).toBe(true);
    });
  });

  test('Writing without the write grant is forbidden', ({ given, when, then }) => {
    givenKey(given);
    createValueStep(when);
    then(/^the tool call fails with error code "(.*)"$/, (code: string) => {
      expect(ctx.response.status).toBe(200);
      expect(ctx.response.body.result.isError).toBe(true);
      expect(toolResultJson().code).toBe(code);
    });
  });

  test('A created tension starts alive', ({ given, when, then, and }) => {
    given(
      /^an MCP API key with grants "(.*)" and a market actor$/,
      async (grants: string) => {
        await provisionAgentKey(grants);
        await createMarketActors(1);
      },
    );
    when(/^the agent calls create_tension named "(.*)" for that actor$/, async (name: string) => {
      await callTool('create_tension', { name, actorId: ctx.actorIds[0] });
    });
    thenToolOk(then);
    and(/^the created tension is in state "(.*)"$/, async (state: string) => {
      await callTool('get_tension', { id: ctx.createdId });
      expectToolOk();
      expect((toolResultJson() as { state: string }).state).toBe(state);
    });
  });

  test('Offering state cannot be set through MCP', ({ given, when, then, and }) => {
    givenKey(given);
    when(
      /^the agent calls create_offering named "(.*)" requesting state "(.*)"$/,
      async (name: string, state: string) => {
        // `state` is not part of the MCP input schema — it must be ignored,
        // never honored.
        await callTool('create_offering', { name, state });
      },
    );
    thenToolOk(then);
    and(/^the created offering is in state "(.*)"$/, async (state: string) => {
      await callTool('get_offering', { id: ctx.createdId });
      expectToolOk();
      expect((toolResultJson() as { state: string }).state).toBe(state);
    });
  });

  test('Create and update an agreement between two actors', ({ given, when, then, and }) => {
    given(
      /^an MCP API key with grants "(.*)" and two market actors$/,
      async (grants: string) => {
        await provisionAgentKey(grants);
        await createMarketActors(2);
      },
    );
    when(
      /^the agent calls create_agreement titled "(.*)" between the two actors$/,
      async (title: string) => {
        await callTool('create_agreement', { title, partyIds: ctx.actorIds });
      },
    );
    thenToolOk(then);
    when(/^the agent calls update_agreement retitling it to "(.*)"$/, async (title: string) => {
      await callTool('update_agreement', { id: ctx.createdId, title });
    });
    thenToolOk(then);
    and(
      /^the agent can get_agreement for the created id and sees title "(.*)"$/,
      async (title: string) => {
        await callTool('get_agreement', { id: ctx.createdId });
        expectToolOk();
        expect((toolResultJson() as { title: string }).title).toBe(title);
      },
    );
  });

  test('Create a taxonomy under a parent', ({ given, and, when, then }) => {
    givenKey(given);
    let parentId = '';
    and(
      /^the agent created a taxonomy with code "(.*)" and name "(.*)"$/,
      async (code: string, name: string) => {
        await callTool('create_taxonomy', { code, name });
        expectToolOk();
        parentId = (toolResultJson() as { id: string }).id;
      },
    );
    when(
      /^the agent calls create_taxonomy with code "(.*)", name "(.*)" under the created taxonomy$/,
      async (code: string, name: string) => {
        await callTool('create_taxonomy', { code, name, parentId });
      },
    );
    thenToolOk(then);
    and(
      /^"(.*)" is a child of "(.*)" in the taxonomy tree$/,
      async (child: string, _parent: string) => {
        const children = await getApp().get(TaxonomiesService).findChildren(parentId);
        expect(children.map((c) => c.name)).toContain(child);
      },
    );
  });

  test('MCP writes are captured in the audit trail', ({ given, when, then, and }) => {
    givenKey(given);
    createValueStep(when);
    then(/^the audit trail records an mcp_call entry for "(.*)"$/, async (tool: string) => {
      expectToolOk();
      ctx.createdId = (toolResultJson() as { id: string }).id;
      const entry = await waitForAudit({ category: 'mcp_call' }, tool);
      expect(entry).toBeDefined();
    });
    and(
      'the audit trail records a mutation entry for the created value attributed to the agent',
      async () => {
        const entry = await waitForAudit(
          { category: 'mutation', entityType: 'value', entityId: ctx.createdId },
          'created',
        );
        expect(entry).toBeDefined();
        expect(entry?.actorKind).toBe('agent');
      },
    );
  });
});

/** Audit writes are post-commit and async — poll briefly for a matching entry. */
async function waitForAudit(
  filters: Record<string, unknown>,
  action?: string,
  timeoutMs = 4000,
): Promise<{ action: string | null; actorKind: string } | undefined> {
  const service = getApp().get(AuditService);
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { data } = await service.findAll({ page: 1, limit: 10, ...filters } as never);
    const rows = data as unknown as { action: string | null; actorKind: string }[];
    const match = action ? rows.find((r) => r.action === action) : rows[0];
    if (match) return match;
    if (Date.now() > deadline) return undefined;
    await new Promise((r) => setTimeout(r, 150));
  }
}
