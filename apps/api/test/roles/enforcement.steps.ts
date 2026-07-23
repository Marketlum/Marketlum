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
import { RolesService, UsersService } from '@marketlum/core';

const enforcementFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/roles/enforcement.feature'),
);

let roleCounter = 0;
function nextCode(prefix: string): string {
  roleCounter += 1;
  return `${prefix}_${roleCounter}`;
}

defineFeature(enforcementFeature, (test) => {
  let response: request.Response;
  let cookie: string;
  let apiKey: string;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
    cookie = '';
    apiKey = '';
  });
  afterAll(async () => {
    await teardownApp();
  });

  function server() {
    return request(getApp().getHttpServer());
  }

  const givenUserWithGrant = (given: (m: RegExp, cb: (email: string, grant: string) => Promise<void>) => void) => {
    given(/^a user "(.*)" with a role granting "(.*)"$/, async (email: string, grant: string) => {
      const created = await createUserWithRoles(email, 'password123', [
        { code: nextCode('grant_role'), permissions: [grant] },
      ]);
      cookie = created.cookie;
    });
  };

  const thenStatus = (then: (m: RegExp, cb: (status: string) => void) => void) => {
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  };

  const whenListsOrders = (when: (m: string, cb: () => Promise<void>) => void) => {
    when('the user lists orders', async () => {
      response = await server().get('/orders/search').set('Cookie', [cookie]);
    });
  };

  test('A read permission allows reading but not writing the resource', ({ given, when, then }) => {
    givenUserWithGrant(given);
    whenListsOrders(when);
    thenStatus(then);
    when('the user creates an order', async () => {
      response = await server()
        .post('/orders')
        .set('Cookie', [cookie])
        .set('X-CSRF-Protection', '1')
        .send({});
    });
    thenStatus(then);
  });

  test('A user with no roles is denied but can still see who they are', ({ given, when, then, and }) => {
    given(/^a user "(.*)" with no roles$/, async (email: string) => {
      const created = await createUserWithRoles(email, 'password123', []);
      cookie = created.cookie;
    });
    whenListsOrders(when);
    thenStatus(then);
    when('the user requests the current user', async () => {
      response = await server().get('/auth/me').set('Cookie', [cookie]);
    });
    thenStatus(then);
    and('the current user permissions should be empty', () => {
      expect(response.body.permissions).toEqual([]);
    });
  });

  test('A wildcard role allows everything', ({ given, when, then }) => {
    givenUserWithGrant(given);
    whenListsOrders(when);
    thenStatus(then);
    when('the user creates a value', async () => {
      response = await server()
        .post('/values')
        .set('Cookie', [cookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Wildcard value', type: 'currency', purpose: 'Created by wildcard user' });
    });
    thenStatus(then);
  });

  test("A parent role inherits its child roles' grants", ({ given, and, when, then }) => {
    let childCode: string;
    let parentCode: string;
    given(/^a role "(.*)" with code "(.*)" granting "(.*)"$/, async (name: string, code: string, grant: string) => {
      childCode = code;
      await getApp().get(RolesService).create({ name, code, permissions: [grant] });
    });
    and(
      /^a role "(.*)" with code "(.*)" granting "(.*)" whose child is "(.*)"$/,
      async (name: string, code: string, grant: string, child: string) => {
        parentCode = code;
        const rolesService = getApp().get(RolesService);
        const parent = await rolesService.create({ name, code, permissions: [grant] });
        const childRole = await rolesService.findByCode(child ?? childCode);
        await rolesService.update(childRole!.id, { parentId: parent.id });
      },
    );
    and(/^a user "(.*)" holding the role "(.*)"$/, async (email: string, code: string) => {
      const created = await createUserWithRoles(email, 'password123', [
        { code: code ?? parentCode, permissions: [] },
      ]);
      cookie = created.cookie;
    });
    whenListsOrders(when);
    thenStatus(then);
  });

  test('Permissions are the union of all assigned roles', ({ given, and, when, then }) => {
    given(/^a role "(.*)" with code "(.*)" granting "(.*)"$/, async (name: string, code: string, grant: string) => {
      await getApp().get(RolesService).create({ name, code, permissions: [grant] });
    });
    and(/^a role "(.*)" with code "(.*)" granting "(.*)"$/, async (name: string, code: string, grant: string) => {
      await getApp().get(RolesService).create({ name, code, permissions: [grant] });
    });
    and(/^a user "(.*)" holding the roles "(.*)"$/, async (email: string, codes: string) => {
      const created = await createUserWithRoles(
        email,
        'password123',
        codes.split(',').map((code) => ({ code, permissions: [] })),
      );
      cookie = created.cookie;
    });
    whenListsOrders(when);
    thenStatus(then);
    when('the user lists values', async () => {
      response = await server().get('/values').set('Cookie', [cookie]);
    });
    thenStatus(then);
  });

  test("An API key is limited by its owner's roles", ({ given, and, when, then }) => {
    givenUserWithGrant(given);
    and('the user has created an API key', async () => {
      const res = await server()
        .post('/api-keys')
        .set('Cookie', [cookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Scoped by roles' });
      apiKey = res.body.key;
    });
    when('an order is created using the API key', async () => {
      response = await server()
        .post('/orders')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({});
    });
    thenStatus(then);
    when('orders are listed using the API key', async () => {
      response = await server().get('/orders/search').set('Authorization', `Bearer ${apiKey}`);
    });
    thenStatus(then);
  });

  test('A user without roles can still manage their own API keys', ({ given, when, then }) => {
    given(/^a user "(.*)" with no roles$/, async (email: string) => {
      const created = await createUserWithRoles(email, 'password123', []);
      cookie = created.cookie;
    });
    when(/^the user creates an API key named "(.*)"$/, async (name: string) => {
      response = await server()
        .post('/api-keys')
        .set('Cookie', [cookie])
        .set('X-CSRF-Protection', '1')
        .send({ name });
    });
    thenStatus(then);
  });

  test('Role management endpoints require the roles permission', ({ given, when, then }) => {
    givenUserWithGrant(given);
    when('the user lists the roles', async () => {
      response = await server().get('/roles').set('Cookie', [cookie]);
    });
    thenStatus(then);
  });

  test('Plugin routes are gated by plugin resources', ({ given, when, then }) => {
    givenUserWithGrant(given);
    when('the user lists RDHY platforms', async () => {
      response = await server().get('/plugins/rdhy/platforms').set('Cookie', [cookie]);
    });
    thenStatus(then);
    whenListsOrders(when);
    thenStatus(then);
  });

  test('The last wildcard-holding user cannot lose their roles', ({ given, and, when, then }) => {
    let myEmail: string;
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      myEmail = email;
      cookie = await createAuthenticatedUser(email, 'password123');
    });
    and(
      /^a role "(.*)" with code "(.*)" and permissions "(.*)" exists$/,
      async (name: string, code: string, permissions: string) => {
        await getApp().get(RolesService).create({ name, code, permissions: permissions.split(',') });
      },
    );
    when(/^I replace my own roles with "(.*)"$/, async (code: string) => {
      const rolesService = getApp().get(RolesService);
      const usersService = getApp().get(UsersService);
      const me = await usersService.findByEmail(myEmail);
      const role = await rolesService.findByCode(code);
      response = await server()
        .put(`/users/${me!.id}/roles`)
        .set('Cookie', [cookie])
        .set('X-CSRF-Protection', '1')
        .send({ roleIds: [role!.id] });
    });
    thenStatus(then);
  });

  test('A wildcard user can be reassigned while another admin remains', ({ given, and, when, then }) => {
    let myEmail: string;
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      myEmail = email;
      cookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^another admin user "(.*)" exists$/, async (email: string) => {
      await createAuthenticatedUser(email, 'password123', 'Second Admin');
    });
    and(
      /^a role "(.*)" with code "(.*)" and permissions "(.*)" exists$/,
      async (name: string, code: string, permissions: string) => {
        await getApp().get(RolesService).create({ name, code, permissions: permissions.split(',') });
      },
    );
    when(/^I replace my own roles with "(.*)"$/, async (code: string) => {
      const rolesService = getApp().get(RolesService);
      const usersService = getApp().get(UsersService);
      const me = await usersService.findByEmail(myEmail);
      const role = await rolesService.findByCode(code);
      response = await server()
        .put(`/users/${me!.id}/roles`)
        .set('Cookie', [cookie])
        .set('X-CSRF-Protection', '1')
        .send({ roleIds: [role!.id] });
    });
    thenStatus(then);
    whenListsOrders(when);
    thenStatus(then);
    when('the user lists the roles', async () => {
      response = await server().get('/roles').set('Cookie', [cookie]);
    });
    thenStatus(then);
  });
});
