import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { UsersService } from '@marketlum/core';
import { UserType } from '@marketlum/shared';
import {
  bootstrapApp,
  teardownApp,
  cleanDatabase,
  getApp,
  createAuthenticatedUser,
  createUserWithRoles,
} from '../setup';

const typesFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/users/user-types.feature'),
);
const actorLinkFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/users/agent-actor-link.feature'),
);
const apiKeysFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/users/agent-api-keys.feature'),
);

function post(path: string, cookie: string, body: Record<string, unknown>) {
  return request(getApp().getHttpServer())
    .post(path)
    .set('Cookie', [cookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
}

async function createAgentUser(
  cookie: string,
  name: string,
  email: string,
  actorId?: string,
): Promise<request.Response> {
  return post('/users', cookie, {
    name,
    email,
    type: 'agent',
    ...(actorId ? { actorId } : {}),
  });
}

// --- USER TYPES ---
defineFeature(typesFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdUserId: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Successfully create an agent user', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I create an agent user with name "(.*)" and email "(.*)"$/,
      async (name: string, email: string) => {
        response = await createAgentUser(authCookie, name, email);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a user with type "(.*)"$/, (type: string) => {
      expect(response.body.type).toBe(type);
    });

    and(/^the response should contain a user with email "(.*)"$/, (email: string) => {
      expect(response.body.email).toBe(email);
    });
  });

  test('Creating an agent user with a password fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I create an agent user with name "(.*)", email "(.*)" and password "(.*)"$/,
      async (name: string, email: string, password: string) => {
        response = await post('/users', authCookie, { name, email, type: 'agent', password });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Creating a human user without a password fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I create a human user with name "(.*)" and email "(.*)" and no password$/,
      async (name: string, email: string) => {
        response = await post('/users', authCookie, { name, email, type: 'human' });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Users default to the human type', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create a user with:',
      async (table: { name: string; email: string; password: string }[]) => {
        const row = table[0];
        response = await post('/users', authCookie, row as unknown as Record<string, unknown>);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a user with type "(.*)"$/, (type: string) => {
      expect(response.body.type).toBe(type);
    });
  });

  test('User type is immutable', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^an agent user exists with name "(.*)" and email "(.*)"$/,
      async (name: string, email: string) => {
        const res = await createAgentUser(authCookie, name, email);
        createdUserId = res.body.id;
      },
    );

    when(/^I update the user's type to "(.*)"$/, async (type: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/users/${createdUserId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ type });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test("Changing an agent user's password fails", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^an agent user exists with name "(.*)" and email "(.*)"$/,
      async (name: string, email: string) => {
        const res = await createAgentUser(authCookie, name, email);
        createdUserId = res.body.id;
      },
    );

    when(/^I change the user's password to "(.*)"$/, async (password: string) => {
      response = await post(`/users/${createdUserId}/change-password`, authCookie, { password });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- AGENT ACTOR LINK ---
defineFeature(actorLinkFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let actorId: string;
  let userId: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Link an agent user to an agent-type actor', ({ given, when, then, and }) => {
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

    when(
      /^I create an agent user with name "(.*)", email "(.*)" and the actor as its market identity$/,
      async (name: string, email: string) => {
        response = await createAgentUser(authCookie, name, email, actorId);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should contain a user linked to the actor', () => {
      expect(response.body.actorId).toBe(actorId);
      expect(response.body.actor?.id).toBe(actorId);
    });
  });

  test('Linking to a non-agent actor fails', ({ given, when, then, and }) => {
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

    when(
      /^I create an agent user with name "(.*)", email "(.*)" and the actor as its market identity$/,
      async (name: string, email: string) => {
        response = await createAgentUser(authCookie, name, email, actorId);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Deleting the linked actor clears the link', ({ given, when, then, and }) => {
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

    and(
      /^an agent user exists with name "(.*)", email "(.*)" and the actor as its market identity$/,
      async (name: string, email: string) => {
        const res = await createAgentUser(authCookie, name, email, actorId);
        userId = res.body.id;
      },
    );

    when('I delete the actor', async () => {
      await request(getApp().getHttpServer())
        .delete(`/actors/${actorId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    and('I fetch the user', async () => {
      response = await request(getApp().getHttpServer())
        .get(`/users/${userId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should contain a user with no linked actor', () => {
      expect(response.body.actorId).toBeNull();
    });
  });
});

// --- AGENT API KEYS ---
defineFeature(apiKeysFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let agentUserId: string;
  let humanUserId: string;
  let keyId: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Admin creates an API key for an agent user', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^an agent user exists with name "(.*)" and email "(.*)"$/,
      async (name: string, email: string) => {
        const res = await createAgentUser(authCookie, name, email);
        agentUserId = res.body.id;
      },
    );

    when(/^I create an API key named "(.*)" for the agent user$/, async (name: string) => {
      response = await post(`/users/${agentUserId}/api-keys`, authCookie, { name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should contain the plaintext API key exactly once', async () => {
      expect(typeof response.body.key).toBe('string');
      expect(response.body.key.length).toBeGreaterThan(20);
      expect(response.body.keyHash).toBeUndefined();
      // The list never exposes the key again.
      const list = await request(getApp().getHttpServer())
        .get(`/users/${agentUserId}/api-keys`)
        .set('Cookie', [authCookie]);
      expect(list.body[0].key).toBeUndefined();
    });
  });

  test('Creating an API key for a human user fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a user exists with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        const res = await post('/users', authCookie, { name: 'Alice', email, password });
        humanUserId = res.body.id;
      },
    );

    when(/^I create an API key named "(.*)" for that human user$/, async (name: string) => {
      response = await post(`/users/${humanUserId}/api-keys`, authCookie, { name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test("Admin lists an agent's API keys", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^an agent user exists with name "(.*)" and email "(.*)"$/,
      async (name: string, email: string) => {
        const res = await createAgentUser(authCookie, name, email);
        agentUserId = res.body.id;
      },
    );

    and(/^the agent user has an API key named "(.*)"$/, async (name: string) => {
      const res = await post(`/users/${agentUserId}/api-keys`, authCookie, { name });
      keyId = res.body.id;
    });

    when("I list the agent user's API keys", async () => {
      response = await request(getApp().getHttpServer())
        .get(`/users/${agentUserId}/api-keys`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the key list contains "(.*)" with metadata only$/, (name: string) => {
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe(name);
      expect(response.body[0].createdAt).toBeDefined();
      expect(response.body[0].key).toBeUndefined();
      expect(response.body[0].keyHash).toBeUndefined();
    });
  });

  test("Admin revokes an agent's API key", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^an agent user exists with name "(.*)" and email "(.*)"$/,
      async (name: string, email: string) => {
        const res = await createAgentUser(authCookie, name, email);
        agentUserId = res.body.id;
      },
    );

    and(/^the agent user has an API key named "(.*)"$/, async (name: string) => {
      const res = await post(`/users/${agentUserId}/api-keys`, authCookie, { name });
      keyId = res.body.id;
    });

    when('I revoke that API key', async () => {
      response = await request(getApp().getHttpServer())
        .delete(`/users/${agentUserId}/api-keys/${keyId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the agent user has no API keys', async () => {
      const list = await request(getApp().getHttpServer())
        .get(`/users/${agentUserId}/api-keys`)
        .set('Cookie', [authCookie]);
      expect(list.body).toHaveLength(0);
    });
  });

  test('A non-admin cannot manage agent API keys', ({ given, when, then, and }) => {
    let limitedCookie: string;

    given('a user without user permissions is authenticated', async () => {
      const { cookie } = await createUserWithRoles('limited@marketlum.com', 'password123', [
        { code: 'no_users_perms', permissions: ['actors:read'] },
      ]);
      limitedCookie = cookie;
    });

    and('an agent user exists in the system', async () => {
      const usersService = getApp().get(UsersService);
      const agent = await usersService.create({
        name: 'Pricing Bot',
        email: 'pricing-bot@marketlum.com',
        type: UserType.AGENT,
      });
      agentUserId = agent.id;
    });

    when(/^I create an API key named "(.*)" for the agent user$/, async (name: string) => {
      response = await post(`/users/${agentUserId}/api-keys`, limitedCookie, { name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
