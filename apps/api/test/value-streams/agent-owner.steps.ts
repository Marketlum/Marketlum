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

const feature = loadFeature(
  path.resolve(
    __dirname,
    '../../../../packages/bdd/features/value-streams/agent-owner.feature',
  ),
);

interface Ctx {
  authCookie: string;
  agents: Map<string, string>;
  streams: Map<string, string>;
  response: request.Response;
}

function makeCtx(): Ctx {
  return {
    authCookie: '',
    agents: new Map(),
    streams: new Map(),
    response: {} as request.Response,
  };
}

let streamCodeCounter = 0;
function nextCode(): string {
  return `vs_test_${Date.now()}_${++streamCodeCounter}`;
}

async function ensureAgent(ctx: Ctx, name: string): Promise<string> {
  if (ctx.agents.has(name)) return ctx.agents.get(name)!;
  const res = await request(getApp().getHttpServer())
    .post('/agents')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'organization' });
  ctx.agents.set(name, res.body.id);
  return res.body.id;
}

async function createValueStream(
  ctx: Ctx,
  name: string,
  options: { agentName?: string | null; parentName?: string } = {},
): Promise<request.Response> {
  const body: Record<string, unknown> = { code: nextCode(), name };
  if (options.agentName !== undefined) {
    body.agentId = options.agentName === null ? null : ctx.agents.get(options.agentName);
  }
  if (options.parentName) {
    body.parentId = ctx.streams.get(options.parentName);
  }
  return request(getApp().getHttpServer())
    .post('/value-streams')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
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

  function registerBackground(
    ctx: Ctx,
    steps: {
      given: (regex: RegExp | string, fn: (...args: never[]) => unknown) => void;
      and: (regex: RegExp | string, fn: (...args: never[]) => unknown) => void;
    },
  ) {
    steps.given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      ctx.authCookie = await createAuthenticatedUser(email, 'password123');
    });
    steps.and(/^an agent exists named "(.*)"$/, async (name: string) => {
      await ensureAgent(ctx, name);
    });
    steps.and(/^an agent exists named "(.*)"$/, async (name: string) => {
      await ensureAgent(ctx, name);
    });
  }

  test('Creating a value stream with an owning agent', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    when(/^I create a value stream named "(.*)" with agent "(.*)"$/,
      async (name: string, agentName: string) => {
        ctx.response = await createValueStream(ctx, name, { agentName });
      });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the value stream agent should be "(.*)"$/, (agentName: string) => {
      expect(ctx.response.body.agent).not.toBeNull();
      expect(ctx.response.body.agent.id).toBe(ctx.agents.get(agentName));
    });
  });

  test('Creating a value stream without an agent is allowed', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    when(/^I create a value stream named "(.*)" without an agent$/, async (name: string) => {
      ctx.response = await createValueStream(ctx, name);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and('the value stream agent should be null', () => {
      expect(ctx.response.body.agent).toBeNull();
    });
  });

  test("Updating a value stream's agent", ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^a value stream exists named "(.*)" with agent "(.*)"$/,
      async (name: string, agentName: string) => {
        const res = await createValueStream(ctx, name, { agentName });
        ctx.streams.set(name, res.body.id);
      });
    when(/^I update that stream's agent to "(.*)"$/, async (agentName: string) => {
      const streamId = Array.from(ctx.streams.values())[0];
      ctx.response = await request(getApp().getHttpServer())
        .patch(`/value-streams/${streamId}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ agentId: ctx.agents.get(agentName) });
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and(/^the value stream agent should be "(.*)"$/, (agentName: string) => {
      expect(ctx.response.body.agent.id).toBe(ctx.agents.get(agentName));
    });
  });

  test('Child value stream does not inherit agent from parent', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, { given, and });
    and(/^a value stream exists named "(.*)" with agent "(.*)"$/,
      async (name: string, agentName: string) => {
        const res = await createValueStream(ctx, name, { agentName });
        ctx.streams.set(name, res.body.id);
      });
    when(/^I create a value stream named "(.*)" under "(.*)" without an agent$/,
      async (childName: string, parentName: string) => {
        ctx.response = await createValueStream(ctx, childName, { parentName });
      });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });
    and('the value stream agent should be null', () => {
      expect(ctx.response.body.agent).toBeNull();
    });
  });
});
