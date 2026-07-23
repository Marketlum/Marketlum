import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import {
  bootstrapApp,
  cleanDatabase,
  teardownApp,
  getApp,
  createAuthenticatedUser,
  createUserViaService,
} from '../setup';
import { RolesService, UsersService } from '@marketlum/core';

const managementFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/roles/management.feature'),
);

defineFeature(managementFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
  });
  afterAll(async () => {
    await teardownApp();
  });

  function server() {
    return request(getApp().getHttpServer());
  }

  async function roleIdByCode(code: string): Promise<string> {
    const role = await getApp().get(RolesService).findByCode(code);
    if (!role) throw new Error(`Role not found: ${code}`);
    return role.id;
  }

  async function createRole(name: string, code: string, permissions: string[]): Promise<request.Response> {
    return server()
      .post('/roles')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ name, code, permissions });
  }

  async function setParent(code: string, parentCode: string): Promise<request.Response> {
    return server()
      .patch(`/roles/${await roleIdByCode(code)}`)
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ parentId: await roleIdByCode(parentCode) });
  }

  const givenAuthenticated = (given: (m: RegExp, cb: (email: string) => Promise<void>) => void) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
  };

  const thenStatus = (then: (m: RegExp, cb: (status: string) => void) => void) => {
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  };

  test('Creating a role with permissions', ({ given, when, then, and }) => {
    givenAuthenticated(given);
    when(
      /^I create a role "(.*)" with code "(.*)" and permissions "(.*)"$/,
      async (name: string, code: string, permissions: string) => {
        response = await createRole(name, code, permissions.split(','));
      },
    );
    thenStatus(then);
    and(/^the role response should have permissions "(.*)"$/, (permissions: string) => {
      expect(response.body.permissions).toEqual(permissions.split(',').sort());
    });
  });

  test('Creating a role with a malformed permission string fails', ({ given, when, then }) => {
    givenAuthenticated(given);
    when(
      /^I create a role "(.*)" with code "(.*)" and permissions "(.*)"$/,
      async (name: string, code: string, permissions: string) => {
        response = await createRole(name, code, permissions.split(','));
      },
    );
    thenStatus(then);
  });

  test('Creating a role with an unknown resource fails', ({ given, when, then }) => {
    givenAuthenticated(given);
    when(
      /^I create a role "(.*)" with code "(.*)" and permissions "(.*)"$/,
      async (name: string, code: string, permissions: string) => {
        response = await createRole(name, code, permissions.split(','));
      },
    );
    thenStatus(then);
  });

  test('Listing roles', ({ given, and, when, then }) => {
    givenAuthenticated(given);
    and(
      /^a role "(.*)" with code "(.*)" and permissions "(.*)" exists$/,
      async (name: string, code: string, permissions: string) => {
        await createRole(name, code, permissions.split(','));
      },
    );
    when('I list the roles', async () => {
      response = await server().get('/roles').set('Cookie', [authCookie]);
    });
    thenStatus(then);
    and(/^the role list should contain a role with code "(.*)"$/, (code: string) => {
      expect(response.body.some((r: { code: string }) => r.code === code)).toBe(true);
    });
    and(/^the role list should contain a role with code "(.*)"$/, (code: string) => {
      expect(response.body.some((r: { code: string }) => r.code === code)).toBe(true);
    });
  });

  test('Updating a role replaces its permissions', ({ given, and, when, then }) => {
    givenAuthenticated(given);
    and(
      /^a role "(.*)" with code "(.*)" and permissions "(.*)" exists$/,
      async (name: string, code: string, permissions: string) => {
        await createRole(name, code, permissions.split(','));
      },
    );
    when(
      /^I update the role "(.*)" with permissions "(.*)"$/,
      async (code: string, permissions: string) => {
        response = await server()
          .patch(`/roles/${await roleIdByCode(code)}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ permissions: permissions.split(',') });
      },
    );
    thenStatus(then);
    and(/^the role response should have permissions "(.*)"$/, (permissions: string) => {
      expect(response.body.permissions).toEqual(permissions.split(',').sort());
    });
  });

  test('Reparenting a role', ({ given, and, when, then }) => {
    givenAuthenticated(given);
    and(
      /^a role "(.*)" with code "(.*)" and permissions "(.*)" exists$/,
      async (name: string, code: string, permissions: string) => {
        await createRole(name, code, permissions.split(','));
      },
    );
    and(
      /^a role "(.*)" with code "(.*)" and permissions "(.*)" exists$/,
      async (name: string, code: string, permissions: string) => {
        await createRole(name, code, permissions.split(','));
      },
    );
    when(/^I set the parent of role "(.*)" to "(.*)"$/, async (code: string, parentCode: string) => {
      response = await setParent(code, parentCode);
    });
    thenStatus(then);
  });

  test('Creating a parent cycle fails', ({ given, and, when, then }) => {
    givenAuthenticated(given);
    and(
      /^a role "(.*)" with code "(.*)" and permissions "(.*)" exists$/,
      async (name: string, code: string, permissions: string) => {
        await createRole(name, code, permissions.split(','));
      },
    );
    and(
      /^a role "(.*)" with code "(.*)" and permissions "(.*)" exists$/,
      async (name: string, code: string, permissions: string) => {
        await createRole(name, code, permissions.split(','));
      },
    );
    and(/^the parent of role "(.*)" is "(.*)"$/, async (code: string, parentCode: string) => {
      await setParent(code, parentCode);
    });
    when(/^I set the parent of role "(.*)" to "(.*)"$/, async (code: string, parentCode: string) => {
      response = await setParent(code, parentCode);
    });
    thenStatus(then);
  });

  test('Deleting a role that users hold fails', ({ given, and, when, then }) => {
    givenAuthenticated(given);
    and(
      /^a role "(.*)" with code "(.*)" and permissions "(.*)" exists$/,
      async (name: string, code: string, permissions: string) => {
        await createRole(name, code, permissions.split(','));
      },
    );
    and(/^a user "(.*)" holds the role "(.*)"$/, async (email: string, code: string) => {
      const user = await createUserViaService(email, 'password123', 'Role Holder');
      await getApp().get(UsersService).assignRoles(user.id, [await roleIdByCode(code)]);
    });
    when(/^I delete the role "(.*)"$/, async (code: string) => {
      response = await server()
        .delete(`/roles/${await roleIdByCode(code)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });
    thenStatus(then);
  });

  test('Deleting a role with child roles fails', ({ given, and, when, then }) => {
    givenAuthenticated(given);
    and(
      /^a role "(.*)" with code "(.*)" and permissions "(.*)" exists$/,
      async (name: string, code: string, permissions: string) => {
        await createRole(name, code, permissions.split(','));
      },
    );
    and(
      /^a role "(.*)" with code "(.*)" and permissions "(.*)" exists$/,
      async (name: string, code: string, permissions: string) => {
        await createRole(name, code, permissions.split(','));
      },
    );
    and(/^the parent of role "(.*)" is "(.*)"$/, async (code: string, parentCode: string) => {
      await setParent(code, parentCode);
    });
    when(/^I delete the role "(.*)"$/, async (code: string) => {
      response = await server()
        .delete(`/roles/${await roleIdByCode(code)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });
    thenStatus(then);
  });

  test('Deleting an unreferenced role succeeds', ({ given, and, when, then }) => {
    givenAuthenticated(given);
    and(
      /^a role "(.*)" with code "(.*)" and permissions "(.*)" exists$/,
      async (name: string, code: string, permissions: string) => {
        await createRole(name, code, permissions.split(','));
      },
    );
    when(/^I delete the role "(.*)"$/, async (code: string) => {
      response = await server()
        .delete(`/roles/${await roleIdByCode(code)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });
    thenStatus(then);
  });

  test('The system Admin role cannot be deleted', ({ given, when, then }) => {
    givenAuthenticated(given);
    when(/^I delete the role "(.*)"$/, async (code: string) => {
      response = await server()
        .delete(`/roles/${await roleIdByCode(code)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });
    thenStatus(then);
  });

  test('The system Admin role grants cannot be changed', ({ given, when, then }) => {
    givenAuthenticated(given);
    when(
      /^I update the role "(.*)" with permissions "(.*)"$/,
      async (code: string, permissions: string) => {
        response = await server()
          .patch(`/roles/${await roleIdByCode(code)}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ permissions: permissions.split(',') });
      },
    );
    thenStatus(then);
  });

  test('Creating a role under a missing parent fails', ({ given, when, then }) => {
    givenAuthenticated(given);
    when(
      /^I create a role "(.*)" with code "(.*)" under a nonexistent parent$/,
      async (name: string, code: string) => {
        response = await server()
          .post('/roles')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name,
            code,
            parentId: '00000000-0000-4000-8000-000000000000',
            permissions: [],
          });
      },
    );
    thenStatus(then);
  });
});
