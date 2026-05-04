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
const avatarFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/users/assign-user-avatar.feature'),
);
const changePasswordFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/users/change-user-password.feature'),
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

// --- ASSIGN USER AVATAR ---
defineFeature(avatarFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdUserId: string;
  const fileIds: Record<string, string> = {};

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    for (const key of Object.keys(fileIds)) {
      delete fileIds[key];
    }
  });

  afterAll(async () => {
    await teardownApp();
  });

  async function createFile(name: string): Promise<string> {
    const buffer = Buffer.from('fake-image-content');
    const res = await request(getApp().getHttpServer())
      .post('/files/upload')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .attach('file', buffer, { filename: name, contentType: 'image/png' });
    fileIds[name] = res.body.id;
    return res.body.id;
  }

  test('Create user with avatar', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    when(
      /^I create a user with avatar "(.*)" and:$/,
      async (avatarName: string, table: { name: string; email: string; password: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/users')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            email: row.email,
            password: row.password,
            avatarId: fileIds[avatarName],
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include avatar "(.*)"$/, (name: string) => {
      expect(response.body.avatar).toBeTruthy();
      expect(response.body.avatar.originalName).toBe(name);
    });
  });

  test('Create user with non-existent avatar', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I create a user with a non-existent avatar and:$/,
      async (table: { name: string; email: string; password: string }[]) => {
        const row = table[0];
        response = await request(getApp().getHttpServer())
          .post('/users')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            name: row.name,
            email: row.email,
            password: row.password,
            avatarId: '00000000-0000-0000-0000-000000000000',
          });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test("Update user's avatar", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    and(
      /^a user exists with name "(.*)" and email "(.*)" and avatar "(.*)"$/,
      async (name: string, email: string, avatarName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/users')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, email, password: 'password123', avatarId: fileIds[avatarName] });
        createdUserId = res.body.id;
      },
    );

    when(/^I update the user's avatar to "(.*)"$/, async (avatarName: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/users/${createdUserId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ avatarId: fileIds[avatarName] });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should include avatar "(.*)"$/, (name: string) => {
      expect(response.body.avatar).toBeTruthy();
      expect(response.body.avatar.originalName).toBe(name);
    });
  });

  test("Remove user's avatar", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    and(
      /^a user exists with name "(.*)" and email "(.*)" and avatar "(.*)"$/,
      async (name: string, email: string, avatarName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/users')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, email, password: 'password123', avatarId: fileIds[avatarName] });
        createdUserId = res.body.id;
      },
    );

    when("I update the user's avatar to null", async () => {
      response = await request(getApp().getHttpServer())
        .patch(`/users/${createdUserId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ avatarId: null });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should have null avatar', () => {
      expect(response.body.avatar).toBeNull();
    });
  });

  test('Get user by ID includes avatar', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    and(
      /^a user exists with name "(.*)" and email "(.*)" and avatar "(.*)"$/,
      async (name: string, email: string, avatarName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/users')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, email, password: 'password123', avatarId: fileIds[avatarName] });
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

    and(/^the response should include avatar "(.*)"$/, (name: string) => {
      expect(response.body.avatar).toBeTruthy();
      expect(response.body.avatar.originalName).toBe(name);
    });
  });

  test('List users includes avatar data', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await createFile(name);
    });

    and(
      /^a user exists with name "(.*)" and email "(.*)" and avatar "(.*)"$/,
      async (name: string, email: string, avatarName: string) => {
        const res = await request(getApp().getHttpServer())
          .post('/users')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, email, password: 'password123', avatarId: fileIds[avatarName] });
        createdUserId = res.body.id;
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

    and(/^the first user in the list should include avatar "(.*)"$/, (name: string) => {
      expect(response.body.data.length).toBeGreaterThan(0);
      const user = response.body.data[0];
      expect(user.avatar).toBeTruthy();
      expect(user.avatar.originalName).toBe(name);
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

// --- CHANGE USER PASSWORD ---
defineFeature(changePasswordFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let createdUserId: string;
  let loginResponse: request.Response;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test("Successfully change a user's password", ({ given, when, then, and }) => {
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

    when(/^I change the user's password to "(.*)"$/, async (password: string) => {
      response = await request(getApp().getHttpServer())
        .post(`/users/${createdUserId}/change-password`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ password });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Login works with the new password after change', ({ given, when, then, and }) => {
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

    when(/^I change the user's password to "(.*)"$/, async (password: string) => {
      response = await request(getApp().getHttpServer())
        .post(`/users/${createdUserId}/change-password`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ password });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(
      /^login with email "(.*)" and password "(.*)" should succeed$/,
      async (email: string, password: string) => {
        loginResponse = await request(getApp().getHttpServer())
          .post('/auth/login')
          .set('X-CSRF-Protection', '1')
          .send({ email, password });
        expect(loginResponse.status).toBe(200);
      },
    );

    and(
      /^login with email "(.*)" and password "(.*)" should fail$/,
      async (email: string, password: string) => {
        loginResponse = await request(getApp().getHttpServer())
          .post('/auth/login')
          .set('X-CSRF-Protection', '1')
          .send({ email, password });
        expect(loginResponse.status).toBe(401);
      },
    );
  });

  test('Change password with too short value returns 400', ({ given, when, then, and }) => {
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

    when(/^I change the user's password to "(.*)"$/, async (password: string) => {
      response = await request(getApp().getHttpServer())
        .post(`/users/${createdUserId}/change-password`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ password });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Change password for non-existent user returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I change the password of user with ID "(.*)" to "(.*)"$/,
      async (id: string, password: string) => {
        response = await request(getApp().getHttpServer())
          .post(`/users/${id}/change-password`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ password });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      /^I change the password of user with ID "(.*)" to "(.*)"$/,
      async (id: string, password: string) => {
        response = await request(getApp().getHttpServer())
          .post(`/users/${id}/change-password`)
          .set('X-CSRF-Protection', '1')
          .send({ password });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
