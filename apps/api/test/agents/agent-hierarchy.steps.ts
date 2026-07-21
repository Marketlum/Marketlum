import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { bootstrapApp, cleanDatabase, teardownApp, getApp, createAuthenticatedUser } from '../setup';
import { expectEventWithId } from '../events/event-steps';

const feature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agents/agent-hierarchy.feature'),
);

type StepFn = (regex: RegExp | string, fn: (...args: never[]) => unknown) => void;

defineFeature(feature, (test) => {
  let response: request.Response;
  let authCookie: string;
  const agentIds = new Map<string, string>();

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    agentIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  function server() {
    return getApp().getHttpServer();
  }

  async function createAgent(
    name: string,
    type: string,
    parentId?: string | null,
  ): Promise<request.Response> {
    const body: Record<string, unknown> = { name, type };
    if (parentId !== undefined) body.parentId = parentId;
    const res = await request(server())
      .post('/agents')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send(body);
    if (res.status === 201) agentIds.set(name, res.body.id);
    return res;
  }

  function registerBackground(given: StepFn) {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
  }

  function registerRootAgentExists(step: StepFn) {
    step(
      /^a root agent exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await createAgent(name, type);
        expect(res.status).toBe(201);
      },
    );
  }

  function registerChildAgentExists(step: StepFn) {
    step(
      /^an agent exists with name "(.*)" and type "(.*)" under parent "(.*)"$/,
      async (name: string, type: string, parentName: string) => {
        const res = await createAgent(name, type, agentIds.get(parentName));
        expect(res.status).toBe(201);
      },
    );
  }

  function registerStatus(then: StepFn) {
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  }

  function registerParentAndLevel(step: StepFn) {
    step(
      /^the agent response has parent "(.*)" and level (\d+)$/,
      (parentName: string, level: string) => {
        expect(response.body.parent).not.toBeNull();
        expect(response.body.parent.name).toBe(parentName);
        expect(response.body.level).toBe(parseInt(level));
      },
    );
  }

  function registerMoveUnder(when: StepFn) {
    when(/^I move the agent "(.*)" under "(.*)"$/, async (name: string, parentName: string) => {
      response = await request(server())
        .patch(`/agents/${agentIds.get(name)}/move`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ parentId: agentIds.get(parentName) });
    });
  }

  function registerMoveToRoot(step: StepFn) {
    step(/^I move the agent "(.*)" to root$/, async (name: string) => {
      response = await request(server())
        .patch(`/agents/${agentIds.get(name)}/move`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ parentId: null });
    });
  }

  function registerListContains(step: StepFn) {
    step(/^the agent list contains exactly "(.*)"$/, (names: string) => {
      const expected = names.split(',').map((n) => n.trim()).sort();
      const actual = response.body.map((a: { name: string }) => a.name).sort();
      expect(actual).toEqual(expected);
    });
  }

  test('Create an agent under a parent', ({ given, when, then, and }) => {
    registerBackground(given);
    registerRootAgentExists(given);
    when(
      /^I create an agent named "(.*)" of type "(.*)" under parent "(.*)"$/,
      async (name: string, type: string, parentName: string) => {
        response = await createAgent(name, type, agentIds.get(parentName));
      },
    );
    registerStatus(then);
    registerParentAndLevel(and);
  });

  test('Create an agent under an unknown parent fails', ({ given, when, then }) => {
    registerBackground(given);
    when(
      /^I create an agent named "(.*)" of type "(.*)" under an unknown parent$/,
      async (name: string, type: string) => {
        response = await createAgent(name, type, randomUUID());
      },
    );
    registerStatus(then);
  });

  test('Get direct children of an agent', ({ given, when, then, and }) => {
    registerBackground(given);
    registerRootAgentExists(given);
    registerChildAgentExists(and);
    registerChildAgentExists(and);
    when(/^I request the children of the agent "(.*)"$/, async (name: string) => {
      response = await request(server())
        .get(`/agents/${agentIds.get(name)}/children`)
        .set('Cookie', [authCookie]);
    });
    registerStatus(then);
    registerListContains(and);
  });

  test('Get the full agent tree', ({ given, when, then, and }) => {
    registerBackground(given);
    registerRootAgentExists(given);
    registerRootAgentExists(and);
    registerChildAgentExists(and);
    when(/^I request the agent tree$/, async () => {
      response = await request(server()).get('/agents/tree').set('Cookie', [authCookie]);
    });
    registerStatus(then);
    and(
      /^the agent tree has a root "(.*)" with child "(.*)"$/,
      (rootName: string, childName: string) => {
        const root = response.body.find((n: { name: string }) => n.name === rootName);
        expect(root).toBeDefined();
        expect(root.children.map((c: { name: string }) => c.name)).toContain(childName);
      },
    );
    and(/^the agent tree has a root "(.*)" with no children$/, (rootName: string) => {
      const root = response.body.find((n: { name: string }) => n.name === rootName);
      expect(root).toBeDefined();
      expect(root.children).toHaveLength(0);
    });
  });

  test('Get descendants of an agent', ({ given, when, then, and }) => {
    registerBackground(given);
    registerRootAgentExists(given);
    registerChildAgentExists(and);
    registerChildAgentExists(and);
    when(/^I request the descendants of the agent "(.*)"$/, async (name: string) => {
      response = await request(server())
        .get(`/agents/${agentIds.get(name)}/descendants`)
        .set('Cookie', [authCookie]);
    });
    registerStatus(then);
    registerListContains(and);
  });

  test('Move an agent to a different parent', ({ given, when, then, and }) => {
    registerBackground(given);
    registerRootAgentExists(given);
    registerRootAgentExists(and);
    registerChildAgentExists(and);
    registerMoveUnder(when);
    registerStatus(then);
    registerParentAndLevel(and);
    and(
      /^the descendants of "(.*)" contain exactly "(.*)"$/,
      async (name: string, expected: string) => {
        const res = await request(server())
          .get(`/agents/${agentIds.get(name)}/descendants`)
          .set('Cookie', [authCookie]);
        expect(res.status).toBe(200);
        const actual = res.body.map((a: { name: string }) => a.name).sort();
        expect(actual).toEqual(expected.split(',').map((n) => n.trim()).sort());
      },
    );
    and(/^the event "(.*)" was published with the entity's id$/, (eventName: string) => {
      expectEventWithId(eventName);
    });
  });

  test('Move an agent to root', ({ given, when, then, and }) => {
    registerBackground(given);
    registerRootAgentExists(given);
    registerChildAgentExists(and);
    registerMoveToRoot(when);
    registerStatus(then);
    and(/^the agent response has no parent and level 0$/, () => {
      expect(response.body.parent).toBeNull();
      expect(response.body.parentId).toBeNull();
      expect(response.body.level).toBe(0);
    });
  });

  test('Move to a non-existent parent fails', ({ given, when, then }) => {
    registerBackground(given);
    registerRootAgentExists(given);
    when(/^I move the agent "(.*)" under an unknown parent$/, async (name: string) => {
      response = await request(server())
        .patch(`/agents/${agentIds.get(name)}/move`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ parentId: randomUUID() });
    });
    registerStatus(then);
  });

  test('Move an agent into its own descendant fails', ({ given, when, then, and }) => {
    registerBackground(given);
    registerRootAgentExists(given);
    registerChildAgentExists(and);
    registerChildAgentExists(and);
    registerMoveUnder(when);
    registerStatus(then);
  });

  test('Move an agent into itself fails', ({ given, when, then }) => {
    registerBackground(given);
    registerRootAgentExists(given);
    registerMoveUnder(when);
    registerStatus(then);
  });

  test('Deleting an agent with sub-agents is rejected', ({ given, when, then, and }) => {
    registerBackground(given);
    registerRootAgentExists(given);
    registerChildAgentExists(and);
    when(/^I delete the agent "(.*)"$/, async (name: string) => {
      response = await request(server())
        .delete(`/agents/${agentIds.get(name)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });
    registerStatus(then);
    registerMoveToRoot(when);
    and(/^I delete the agent "(.*)"$/, async (name: string) => {
      response = await request(server())
        .delete(`/agents/${agentIds.get(name)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });
    registerStatus(then);
  });
});
