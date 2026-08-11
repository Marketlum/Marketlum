import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { AuditLog, AuditService, RolesService, UsersService } from '@marketlum/core';
import { UserType } from '@marketlum/shared';
import {
  bootstrapApp,
  cleanDatabase,
  teardownApp,
  getApp,
  createAuthenticatedUser,
  createUserWithRoles,
} from '../setup';

const feature = (name: string) =>
  loadFeature(path.resolve(__dirname, `../../../../packages/bdd/features/audit/${name}.feature`));

const mutationFeature = feature('mutation-capture');
const mcpFeature = feature('mcp-capture');
const authFeature = feature('auth-capture');
const queryFeature = feature('query-api');
const immutabilityFeature = feature('immutability');

type AuditRow = AuditLog & { createdAt: string | Date };

function post(pathname: string, cookie: string, body: Record<string, unknown>) {
  return request(getApp().getHttpServer())
    .post(pathname)
    .set('Cookie', [cookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
}

/** Audit writes are post-commit and async — poll briefly for a matching entry. */
async function waitForAudit(
  filters: Record<string, unknown>,
  action?: string,
  timeoutMs = 4000,
): Promise<AuditRow | undefined> {
  const service = getApp().get(AuditService);
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { data } = await service.findAll({ page: 1, limit: 10, ...filters } as never);
    const rows = data as unknown as AuditRow[];
    const match = action ? rows.find((r) => r.action === action) : rows[0];
    if (match) return match;
    if (Date.now() > deadline) return undefined;
    await new Promise((r) => setTimeout(r, 150));
  }
}

async function createAgentWithKey(
  adminCookie: string,
  permission: string,
  keyName: string,
): Promise<{ agentId: string; key: string }> {
  const agentRes = await post('/users', adminCookie, {
    name: 'Pricing Bot',
    email: 'pricing-bot@marketlum.com',
    type: 'agent',
  });
  const agentId = agentRes.body.id;
  const role = await getApp()
    .get(RolesService)
    .create({ name: 'Agent Role', code: 'agent_audit_role', parentId: null, permissions: [permission] });
  await getApp().get(UsersService).assignRoles(agentId, [role.id]);
  const keyRes = await post(`/users/${agentId}/api-keys`, adminCookie, { name: keyName });
  return { agentId, key: keyRes.body.key };
}

function mcpCall(key: string, tool: string, args: Record<string, unknown>) {
  return request(getApp().getHttpServer())
    .post('/mcp')
    .set('Accept', 'application/json, text/event-stream')
    .set('Content-Type', 'application/json')
    .set('Authorization', `Bearer ${key}`)
    .send({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: tool, arguments: args } });
}

// --- MUTATION CAPTURE ---
defineFeature(mutationFeature, (test) => {
  let authCookie: string;
  let actorId: string;
  let entry: AuditRow | undefined;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
  });
  afterAll(async () => {
    await teardownApp();
  });

  const givenAdmin = (given: (m: RegExp, cb: (email: string) => Promise<void>) => void) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
  };

  const thenEntryForActor = (
    then: (m: RegExp, cb: (category: string, action: string) => Promise<void>) => void,
  ) => {
    then(
      /^the latest audit entry has category "(.*)" and action "(.*)" for that actor$/,
      async (category: string, action: string) => {
        entry = await waitForAudit({ category, entityType: 'actor', entityId: actorId }, action);
        expect(entry).toBeDefined();
        expect(entry?.action).toBe(action);
      },
    );
  };

  test("A human's create is attributed", ({ given, when, then, and }) => {
    givenAdmin(given);
    when(
      /^I create an actor with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await post('/actors', authCookie, { name, type });
        actorId = res.body.id;
      },
    );
    thenEntryForActor(then);
    and(/^the audit entry is attributed to the human "(.*)"$/, (email: string) => {
      expect(entry?.actorKind).toBe('human');
      expect(entry?.userEmail).toBe(email);
    });
  });

  test("A human's update is attributed", ({ given, when, then, and }) => {
    givenAdmin(given);
    and(
      /^an actor exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await post('/actors', authCookie, { name, type });
        actorId = res.body.id;
      },
    );
    when(/^I rename the actor to "(.*)"$/, async (name: string) => {
      await request(getApp().getHttpServer())
        .patch(`/actors/${actorId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name });
    });
    thenEntryForActor(then);
    and(/^the audit entry is attributed to the human "(.*)"$/, (email: string) => {
      expect(entry?.actorKind).toBe('human');
      expect(entry?.userEmail).toBe(email);
    });
  });

  test("A human's delete is attributed", ({ given, when, then, and }) => {
    givenAdmin(given);
    and(
      /^an actor exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await post('/actors', authCookie, { name, type });
        actorId = res.body.id;
      },
    );
    when('I delete the actor', async () => {
      await request(getApp().getHttpServer())
        .delete(`/actors/${actorId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });
    thenEntryForActor(then);
    and(/^the audit entry is attributed to the human "(.*)"$/, (email: string) => {
      expect(entry?.actorKind).toBe('human');
      expect(entry?.userEmail).toBe(email);
    });
  });

  test("An agent's API-keyed mutation is attributed to the agent and its key", ({
    given,
    when,
    then,
    and,
  }) => {
    let agentKey: string;
    given(
      /^an agent user with an "(.*)" role and a provisioned API key named "(.*)"$/,
      async (permission: string, keyName: string) => {
        const adminCookie = await createAuthenticatedUser('admin@marketlum.com', 'password123');
        const agent = await createAgentWithKey(adminCookie, permission, keyName);
        agentKey = agent.key;
      },
    );
    when(/^the agent creates an actor named "(.*)" via the REST API$/, async (name: string) => {
      const res = await request(getApp().getHttpServer())
        .post('/actors')
        .set('Authorization', `Bearer ${agentKey}`)
        .send({ name, type: 'organization' });
      actorId = res.body.id;
      expect(res.status).toBe(201);
    });
    thenEntryForActor(then);
    and(/^the audit entry is attributed to the agent with API key "(.*)"$/, (keyName: string) => {
      expect(entry?.actorKind).toBe('agent');
      expect(entry?.apiKeyName).toBe(keyName);
    });
  });
});

// --- MCP CAPTURE ---
defineFeature(mcpFeature, (test) => {
  let agentKey: string;
  let entry: AuditRow | undefined;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
  });
  afterAll(async () => {
    await teardownApp();
  });

  const givenAgent = (given: (m: RegExp, cb: (p: string, k: string) => Promise<void>) => void) => {
    given(
      /^an agent user with an "(.*)" role and a provisioned API key named "(.*)"$/,
      async (permission: string, keyName: string) => {
        const adminCookie = await createAuthenticatedUser('admin@marketlum.com', 'password123');
        const agent = await createAgentWithKey(adminCookie, permission, keyName);
        agentKey = agent.key;
      },
    );
  };

  test('A successful tool call is logged with its arguments', ({ given, when, then, and }) => {
    givenAgent(given);
    when(
      /^the agent calls the "(.*)" MCP tool searching for "(.*)"$/,
      async (tool: string, query: string) => {
        const res = await mcpCall(agentKey, tool, { query });
        expect(res.status).toBe(200);
      },
    );
    then(
      /^the latest audit entry has category "(.*)" and action "(.*)"$/,
      async (category: string, action: string) => {
        entry = await waitForAudit({ category, actorKind: 'agent' }, action);
        expect(entry).toBeDefined();
        expect(entry?.action).toBe(action);
      },
    );
    and(
      /^the audit entry context records the search arguments and outcome "(.*)"$/,
      (outcome: string) => {
        const context = entry?.context as { arguments?: { query?: string }; outcome?: string };
        expect(context.arguments?.query).toBe('Acme');
        expect(context.outcome).toBe(outcome);
      },
    );
    and(/^the audit entry is attributed to the agent with API key "(.*)"$/, (keyName: string) => {
      expect(entry?.actorKind).toBe('agent');
      expect(entry?.apiKeyName).toBe(keyName);
    });
  });

  test('A failed tool call is logged with its error code', ({ given, when, then, and }) => {
    givenAgent(given);
    when(/^the agent calls the "(.*)" MCP tool with a malformed id$/, async (tool: string) => {
      const res = await mcpCall(agentKey, tool, { id: 'not-a-uuid' });
      expect(res.status).toBe(200);
    });
    then(
      /^the latest audit entry has category "(.*)" and action "(.*)"$/,
      async (category: string, action: string) => {
        entry = await waitForAudit({ category, actorKind: 'agent' }, action);
        expect(entry).toBeDefined();
        expect(entry?.action).toBe(action);
      },
    );
    and(/^the audit entry context records outcome "(.*)"$/, (outcome: string) => {
      const context = entry?.context as { outcome?: string; errorCode?: string };
      expect(context.outcome).toBe(outcome);
      expect(context.errorCode).toBeDefined();
    });
  });
});

// --- AUTH CAPTURE ---
defineFeature(authFeature, (test) => {
  let entry: AuditRow | undefined;
  let sessionCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
  });
  afterAll(async () => {
    await teardownApp();
  });

  async function login(email: string, password: string) {
    return request(getApp().getHttpServer())
      .post('/auth/login')
      .set('X-CSRF-Protection', '1')
      .send({ email, password });
  }

  test('A successful login is logged', ({ given, when, then, and }) => {
    given(
      /^a user exists with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        await getApp().get(UsersService).create({ name: 'Alice', email, password });
      },
    );
    when(/^I log in as "(.*)" with password "(.*)"$/, async (email: string, password: string) => {
      await login(email, password);
    });
    then(
      /^the latest audit entry has category "(.*)" and action "(.*)"$/,
      async (category: string, action: string) => {
        entry = await waitForAudit({ category }, action);
        expect(entry?.action).toBe(action);
      },
    );
    and(/^the audit entry is attributed to the human "(.*)"$/, (email: string) => {
      expect(entry?.actorKind).toBe('human');
      expect(entry?.userEmail).toBe(email);
    });
  });

  test('A failed login records the attempted email and nothing password-shaped', ({
    when,
    then,
    and,
  }) => {
    when(/^I log in as "(.*)" with password "(.*)"$/, async (email: string, password: string) => {
      await login(email, password);
    });
    then(
      /^the latest audit entry has category "(.*)" and action "(.*)"$/,
      async (category: string, action: string) => {
        entry = await waitForAudit({ category }, action);
        expect(entry?.action).toBe(action);
      },
    );
    and(/^the audit entry context records attempted email "(.*)"$/, (email: string) => {
      expect((entry?.context as { attemptedEmail?: string }).attemptedEmail).toBe(email);
    });
    and('the audit entry context contains no password material', () => {
      const serialized = JSON.stringify(entry?.context ?? {}).toLowerCase();
      expect(serialized).not.toContain('password');
      expect(serialized).not.toContain('wrong-password');
    });
  });

  test('A logout is logged', ({ given, when, then, and }) => {
    given(
      /^a user exists with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        await getApp().get(UsersService).create({ name: 'Alice', email, password });
      },
    );
    and(
      /^I am logged in as "(.*)" with password "(.*)"$/,
      async (email: string, password: string) => {
        const res = await login(email, password);
        const cookies = res.headers['set-cookie'];
        const tokenCookie = (Array.isArray(cookies) ? cookies : [cookies]).find((c: string) =>
          c.startsWith('token='),
        );
        sessionCookie = tokenCookie ?? '';
      },
    );
    when('I log out', async () => {
      await request(getApp().getHttpServer())
        .post('/auth/logout')
        .set('Cookie', [sessionCookie])
        .set('X-CSRF-Protection', '1');
    });
    then(
      /^the latest audit entry has category "(.*)" and action "(.*)"$/,
      async (category: string, action: string) => {
        entry = await waitForAudit({ category }, action);
        expect(entry).toBeDefined();
      },
    );
    and(/^the audit entry is attributed to the human "(.*)"$/, (email: string) => {
      expect(entry?.actorKind).toBe('human');
      expect(entry?.userEmail).toBe(email);
    });
  });

  test('An agent login attempt is recorded with its rejection reason', ({ given, when, then, and }) => {
    given(/^an agent user exists with email "(.*)"$/, async (email: string) => {
      await getApp().get(UsersService).create({ name: 'Pricing Bot', email, type: UserType.AGENT });
    });
    when(/^I log in as "(.*)" with password "(.*)"$/, async (email: string, password: string) => {
      await login(email, password);
    });
    then(
      /^the latest audit entry has category "(.*)" and action "(.*)"$/,
      async (category: string, action: string) => {
        entry = await waitForAudit({ category }, action);
        expect(entry?.action).toBe(action);
      },
    );
    and(/^the audit entry context records rejection reason "(.*)"$/, (reason: string) => {
      expect((entry?.context as { reason?: string }).reason).toBe(reason);
    });
  });
});

// --- QUERY API ---
defineFeature(queryFeature, (test) => {
  let authCookie: string;
  let actorId: string;
  let response: request.Response;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
  });
  afterAll(async () => {
    await teardownApp();
  });

  const givenAdmin = (given: (m: RegExp, cb: (email: string) => Promise<void>) => void) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
  };

  const andActor = (and: (m: RegExp, cb: (n: string, t: string) => Promise<void>) => void) => {
    and(
      /^an actor exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await post('/actors', authCookie, { name, type });
        actorId = res.body.id;
        // Capture is async post-commit — ensure the entry landed before querying.
        await waitForAudit({ category: 'mutation', entityType: 'actor', entityId: actorId });
      },
    );
  };

  test('Filter by actor kind', ({ given, and, when, then }) => {
    givenAdmin(given);
    andActor(and);
    when(/^I list audit entries filtered by actor kind "(.*)"$/, async (kind: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/audit-logs?actorKind=${kind}`)
        .set('Cookie', [authCookie]);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(/^every returned audit entry has actor kind "(.*)"$/, (kind: string) => {
      expect(response.body.data.length).toBeGreaterThan(0);
      for (const row of response.body.data) expect(row.actorKind).toBe(kind);
    });
  });

  test('Filter by entity', ({ given, and, when, then }) => {
    givenAdmin(given);
    andActor(and);
    when('I list audit entries for that actor entity', async () => {
      response = await request(getApp().getHttpServer())
        .get(`/audit-logs?entityType=actor&entityId=${actorId}`)
        .set('Cookie', [authCookie]);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and('every returned audit entry references that actor', () => {
      expect(response.body.data.length).toBeGreaterThan(0);
      for (const row of response.body.data) {
        expect(row.entityType).toBe('actor');
        expect(row.entityId).toBe(actorId);
      }
    });
  });

  test('Text search matches the actor email', ({ given, and, when, then }) => {
    givenAdmin(given);
    andActor(and);
    when(/^I search audit entries for "(.*)"$/, async (query: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/audit-logs?search=${encodeURIComponent(query)}`)
        .set('Cookie', [authCookie]);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and('the audit list is not empty', () => {
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  test('List the distinct entity types present in the trail', ({ given, and, when, then }) => {
    givenAdmin(given);
    andActor(and);
    when('I list the audit entity types', async () => {
      response = await request(getApp().getHttpServer())
        .get('/audit-logs/entity-types')
        .set('Cookie', [authCookie]);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(/^the entity type list contains "(.*)"$/, (entityType: string) => {
      expect(response.body).toContain(entityType);
    });
  });

  test('Reading the audit trail requires the audit permission', ({ given, when, then }) => {
    given('a user without audit permissions is authenticated', async () => {
      const { cookie } = await createUserWithRoles('limited@marketlum.com', 'password123', [
        { code: 'no_audit_perms', permissions: ['actors:read'] },
      ]);
      authCookie = cookie;
    });
    when('I list audit entries', async () => {
      response = await request(getApp().getHttpServer())
        .get('/audit-logs')
        .set('Cookie', [authCookie]);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- IMMUTABILITY ---
defineFeature(immutabilityFeature, (test) => {
  let authCookie: string;
  let actorId: string;
  let patchStatus = 0;
  let deleteStatus = 0;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
  });
  afterAll(async () => {
    await teardownApp();
  });

  test('Audit entries cannot be modified or deleted through the API', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(
      /^an actor exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await post('/actors', authCookie, { name, type });
        actorId = res.body.id;
      },
    );
    when('I attempt to modify and delete the latest audit entry', async () => {
      const entry = await waitForAudit({ category: 'mutation', entityType: 'actor', entityId: actorId });
      expect(entry).toBeDefined();
      const patchRes = await request(getApp().getHttpServer())
        .patch(`/audit-logs/${entry?.id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ action: 'tampered' });
      patchStatus = patchRes.status;
      const deleteRes = await request(getApp().getHttpServer())
        .delete(`/audit-logs/${entry?.id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
      deleteStatus = deleteRes.status;
    });
    then('both attempts are rejected as unknown routes', () => {
      expect(patchStatus).toBe(404);
      expect(deleteStatus).toBe(404);
    });
  });
});
