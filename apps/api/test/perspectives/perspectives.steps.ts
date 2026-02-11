import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { bootstrapApp, cleanDatabase, teardownApp, getApp, createAuthenticatedUser } from '../setup';

const feature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/perspectives/manage-perspectives.feature'),
);

defineFeature(feature, (test) => {
  let response: request.Response;
  let authCookie: string;
  const perspectiveIds: Record<string, string> = {};

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    authCookie = '';
    for (const key of Object.keys(perspectiveIds)) {
      delete perspectiveIds[key];
    }
  });

  afterAll(async () => {
    await teardownApp();
  });

  // --- Helper functions ---

  async function createPerspective(
    name: string,
    table: string,
    cookie: string,
    extra: Record<string, unknown> = {},
  ): Promise<request.Response> {
    const res = await request(getApp().getHttpServer())
      .post('/perspectives')
      .set('Cookie', [cookie])
      .set('X-CSRF-Protection', '1')
      .send({ name, table, ...extra });
    if (res.body?.id) {
      perspectiveIds[name] = res.body.id;
    }
    return res;
  }

  // --- CREATE ---

  test('Successfully create a perspective', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create a perspective with:',
      async (table: { name: string; table: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/perspectives')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, table: row.table });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a perspective with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and(/^the response should contain a perspective with table "(.*)"$/, (table: string) => {
      expect(response.body.table).toBe(table);
    });
  });

  test('Create a perspective with full config', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I create a perspective with name "(.*)" for table "(.*)" and config:$/,
      async (
        name: string,
        table: string,
        configTable: { columnVisibility: string; filters: string; sortBy: string; sortOrder: string }[],
      ) => {
        const row = configTable[0];
        response = await request(getApp().getHttpServer())
          .post('/perspectives')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name,
            table,
            config: {
              columnVisibility: JSON.parse(row.columnVisibility),
              filters: JSON.parse(row.filters),
              sort: { sortBy: row.sortBy, sortOrder: row.sortOrder },
            },
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a perspective with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });

    and('the response config should have columnVisibility with purpose set to false', () => {
      expect(response.body.config.columnVisibility.purpose).toBe(false);
    });

    and(
      /^the response config should have sort with sortBy "(.*)" and sortOrder "(.*)"$/,
      (sortBy: string, sortOrder: string) => {
        expect(response.body.config.sort.sortBy).toBe(sortBy);
        expect(response.body.config.sort.sortOrder).toBe(sortOrder);
      },
    );
  });

  test('Creating a perspective with isDefault unsets previous default', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^I have a default perspective "(.*)" for table "(.*)"$/,
      async (name: string, table: string) => {
        await createPerspective(name, table, authCookie, { isDefault: true });
      },
    );

    when(
      'I create a perspective with:',
      async (table: { name: string; table: string; isDefault: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/perspectives')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, table: row.table, isDefault: row.isDefault === 'true' });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the perspective "(.*)" should no longer be default$/, async (name: string) => {
      const res = await request(getApp().getHttpServer())
        .get('/perspectives?table=values')
        .set('Cookie', [authCookie]);
      const perspective = res.body.find((p: { name: string }) => p.name === name);
      expect(perspective.isDefault).toBe(false);
    });
  });

  test('Creating a perspective with invalid data fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      'I create a perspective with:',
      async (table: { name: string; table: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/perspectives')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, table: row.table });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated create is rejected', ({ when, then }) => {
    when(
      'I create a perspective with:',
      async (table: { name: string; table: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/perspectives')
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name, table: row.table });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  // --- LIST ---

  test('List perspectives for a table', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^I have a perspective "(.*)" for table "(.*)"$/,
      async (name: string, table: string) => {
        await createPerspective(name, table, authCookie);
      },
    );

    and(
      /^I have a perspective "(.*)" for table "(.*)"$/,
      async (name: string, table: string) => {
        await createPerspective(name, table, authCookie);
      },
    );

    when(/^I list perspectives for table "(.*)"$/, async (table: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/perspectives?table=${table}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) perspective$/, (count: string) => {
      expect(response.body).toHaveLength(parseInt(count));
    });

    and(/^the response should contain a perspective named "(.*)"$/, (name: string) => {
      expect(response.body.some((p: { name: string }) => p.name === name)).toBe(true);
    });
  });

  test('Other user perspectives are not visible', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^I have a perspective "(.*)" for table "(.*)"$/,
      async (name: string, table: string) => {
        await createPerspective(name, table, authCookie);
      },
    );

    when(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123', 'Other User');
    });

    and(/^I list perspectives for table "(.*)"$/, async (table: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/perspectives?table=${table}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) perspectives$/, (count: string) => {
      expect(response.body).toHaveLength(parseInt(count));
    });
  });

  test('Unauthenticated list is rejected', ({ when, then }) => {
    when(/^I list perspectives for table "(.*)"$/, async (table: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/perspectives?table=${table}`);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  // --- UPDATE ---

  test('Update perspective name', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^I have a perspective "(.*)" for table "(.*)"$/,
      async (name: string, table: string) => {
        await createPerspective(name, table, authCookie);
      },
    );

    when(
      /^I update perspective "(.*)" with:$/,
      async (name: string, table: { name: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .patch(`/perspectives/${perspectiveIds[name]}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a perspective with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Update perspective config', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^I have a perspective "(.*)" for table "(.*)"$/,
      async (name: string, table: string) => {
        await createPerspective(name, table, authCookie);
      },
    );

    when(
      /^I update perspective "(.*)" with config:$/,
      async (
        name: string,
        configTable: { columnVisibility: string; filters: string; sortBy: string; sortOrder: string }[],
      ) => {
        const row = configTable[0];
        response = await request(getApp().getHttpServer())
          .patch(`/perspectives/${perspectiveIds[name]}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            config: {
              columnVisibility: JSON.parse(row.columnVisibility),
              filters: JSON.parse(row.filters),
              sort: { sortBy: row.sortBy, sortOrder: row.sortOrder },
            },
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response config should have columnVisibility with createdAt set to false', () => {
      expect(response.body.config.columnVisibility.createdAt).toBe(false);
    });

    and(
      /^the response config should have filters with type set to "(.*)"$/,
      (typeValue: string) => {
        expect(response.body.config.filters.type).toBe(typeValue);
      },
    );
  });

  test('Setting isDefault unsets previous default on update', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^I have a default perspective "(.*)" for table "(.*)"$/,
      async (name: string, table: string) => {
        await createPerspective(name, table, authCookie, { isDefault: true });
      },
    );

    and(
      /^I have a perspective "(.*)" for table "(.*)"$/,
      async (name: string, table: string) => {
        await createPerspective(name, table, authCookie);
      },
    );

    when(
      /^I update perspective "(.*)" with:$/,
      async (name: string, table: { isDefault: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .patch(`/perspectives/${perspectiveIds[name]}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ isDefault: row.isDefault === 'true' });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the perspective "(.*)" should no longer be default$/, async (name: string) => {
      const res = await request(getApp().getHttpServer())
        .get('/perspectives?table=values')
        .set('Cookie', [authCookie]);
      const perspective = res.body.find((p: { name: string }) => p.name === name);
      expect(perspective.isDefault).toBe(false);
    });
  });

  test('Cannot update another user perspective', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^I have a perspective "(.*)" for table "(.*)"$/,
      async (name: string, table: string) => {
        await createPerspective(name, table, authCookie);
      },
    );

    when(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123', 'Other User');
    });

    and(
      /^I update perspective "(.*)" with:$/,
      async (name: string, table: { name: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .patch(`/perspectives/${perspectiveIds[name]}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Updating non-existent perspective returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I update perspective with id "(.*)" with:$/,
      async (id: string, table: { name: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .patch(`/perspectives/${id}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated update is rejected', ({ when, then }) => {
    when(
      /^I update perspective with id "(.*)" with:$/,
      async (id: string, table: { name: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .patch(`/perspectives/${id}`)
          .set('X-CSRF-Protection', '1')
          .send({ name: row.name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  // --- DELETE ---

  test('Delete a perspective', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^I have a perspective "(.*)" for table "(.*)"$/,
      async (name: string, table: string) => {
        await createPerspective(name, table, authCookie);
      },
    );

    when(/^I delete perspective "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/perspectives/${perspectiveIds[name]}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Cannot delete another user perspective', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^I have a perspective "(.*)" for table "(.*)"$/,
      async (name: string, table: string) => {
        await createPerspective(name, table, authCookie);
      },
    );

    when(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123', 'Other User');
    });

    and(/^I delete perspective "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/perspectives/${perspectiveIds[name]}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Deleting non-existent perspective returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I delete perspective with id "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/perspectives/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated delete is rejected', ({ when, then }) => {
    when(/^I delete perspective with id "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/perspectives/${id}`)
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
