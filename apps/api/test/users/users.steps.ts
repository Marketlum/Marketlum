import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { bootstrapApp, cleanDatabase, teardownApp, getApp, createAuthenticatedUser } from '../setup';

const createFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/users/create-user.feature'),
);
const listFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/users/list-users.feature'),
);
const getFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/users/get-user.feature'),
);
const updateFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/users/update-user.feature'),
);
const deleteFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/users/delete-user.feature'),
);

// --- CREATE USER ---
defineFeature(createFeature, (test) => {
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

  test('Successfully create a new user', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create a user with:', async (table: { name: string; email: string; password: string }[]) => {
      const row = table[0];
      response = await request(getApp().getHttpServer())
        .post('/users')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: row.name, email: row.email, password: row.password });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a user with email "(.*)"$/, (email: string) => {
      expect(response.body.email).toBe(email);
    });

    and(/^the response should contain a user with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Creating a user with a duplicate email fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a user exists with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        await request(getApp().getHttpServer())
          .post('/users')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ email, password, name: 'Existing' });
      },
    );

    when('I create a user with:', async (table: { name: string; email: string; password: string }[]) => {
      const row = table[0];
      response = await request(getApp().getHttpServer())
        .post('/users')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: row.name, email: row.email, password: row.password });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Creating a user with invalid data fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create a user with:', async (table: { name: string; email: string; password: string }[]) => {
      const row = table[0];
      response = await request(getApp().getHttpServer())
        .post('/users')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: row.name, email: row.email, password: row.password });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I create a user with:', async (table: { name: string; email: string; password: string }[]) => {
      const row = table[0];
      response = await request(getApp().getHttpServer())
        .post('/users')
        .set('X-CSRF-Protection', '1')
        .send({ name: row.name, email: row.email, password: row.password });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- LIST USERS ---
defineFeature(listFeature, (test) => {
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

  test('List users with default pagination', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following users exist:',
      async (table: { name: string; email: string; password: string }[]) => {
        for (const row of table) {
          await request(getApp().getHttpServer())
            .post('/users')
            .set('Cookie', [authCookie])
            .set('X-CSRF-Protection', '1')
            .send({ name: row.name, email: row.email, password: row.password });
        }
      },
    );

    when('I request the list of users', async () => {
      response = await request(getApp().getHttpServer())
        .get('/users')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should contain a paginated list', () => {
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
      expect(response.body.meta).toHaveProperty('totalPages');
    });

    and(/^the total count should be at least (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBeGreaterThanOrEqual(parseInt(count));
    });
  });

  test('Search users by name', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following users exist:',
      async (table: { name: string; email: string; password: string }[]) => {
        for (const row of table) {
          await request(getApp().getHttpServer())
            .post('/users')
            .set('Cookie', [authCookie])
            .set('X-CSRF-Protection', '1')
            .send({ name: row.name, email: row.email, password: row.password });
        }
      },
    );

    when(/^I request the list of users with search "(.*)"$/, async (search: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/users?search=${search}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(
      /^all returned users should have "(.*)" in their name or email$/,
      (searchTerm: string) => {
        const term = searchTerm.toLowerCase();
        for (const user of response.body.data) {
          const nameMatch = user.name.toLowerCase().includes(term);
          const emailMatch = user.email.toLowerCase().includes(term);
          expect(nameMatch || emailMatch).toBe(true);
        }
      },
    );
  });

  test('Paginate users', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following users exist:',
      async (table: { name: string; email: string; password: string }[]) => {
        for (const row of table) {
          await request(getApp().getHttpServer())
            .post('/users')
            .set('Cookie', [authCookie])
            .set('X-CSRF-Protection', '1')
            .send({ name: row.name, email: row.email, password: row.password });
        }
      },
    );

    when(
      /^I request the list of users with page (\d+) and limit (\d+)$/,
      async (page: string, limit: string) => {
        response = await request(getApp().getHttpServer())
          .get(`/users?page=${page}&limit=${limit}`)
          .set('Cookie', [authCookie]);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) user$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I request the list of users', async () => {
      response = await request(getApp().getHttpServer()).get('/users');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- GET USER ---
defineFeature(getFeature, (test) => {
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

  test('Get an existing user by ID', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a user exists with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/users')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ email, password, name: 'Alice' });
        createdUserId = res.body.id;
      },
    );

    when('I request the user by their ID', async () => {
      response = await request(getApp().getHttpServer())
        .get(`/users/${createdUserId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a user with email "(.*)"$/, (email: string) => {
      expect(response.body.email).toBe(email);
    });
  });

  test('Get a non-existent user returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I request a user with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/users/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I request a user with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer()).get(`/users/${id}`);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- UPDATE USER ---
defineFeature(updateFeature, (test) => {
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

  test("Successfully update a user's name", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a user exists with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/users')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ email, password, name: 'Alice' });
        createdUserId = res.body.id;
      },
    );

    when(/^I update the user's name to "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/users/${createdUserId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a user with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Update a non-existent user returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I update the user with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/users/${id}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      /^I update the user with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/users/${id}`)
          .set('X-CSRF-Protection', '1')
          .send({ name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DELETE USER ---
defineFeature(deleteFeature, (test) => {
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

  test('Successfully delete a user', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a user exists with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/users')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ email, password, name: 'Alice' });
        createdUserId = res.body.id;
      },
    );

    when('I delete the user', async () => {
      response = await request(getApp().getHttpServer())
        .delete(`/users/${createdUserId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Delete a non-existent user returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I delete the user with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/users/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I delete the user with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/users/${id}`)
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
