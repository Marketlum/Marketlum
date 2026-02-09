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

const loginFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/auth/login.feature'),
);
const logoutFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/auth/logout.feature'),
);
const meFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/auth/me.feature'),
);

defineFeature(loginFeature, (test) => {
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

  test('Successful login with valid credentials', ({ given, when, then, and }) => {
    given(
      /^a user exists with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        await createUserViaService(email, password);
      },
    );

    when(/^I login with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(getApp().getHttpServer())
        .post('/auth/login')
        .set('X-CSRF-Protection', '1')
        .send({ email, password });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a user with email "(.*)"$/, (email: string) => {
      expect(response.body.email).toBe(email);
    });

    and(/^the response should set an httpOnly cookie "(.*)"$/, (cookieName: string) => {
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const tokenCookie = (Array.isArray(cookies) ? cookies : [cookies]).find((c: string) =>
        c.startsWith(`${cookieName}=`),
      );
      expect(tokenCookie).toBeDefined();
      expect(tokenCookie).toContain('HttpOnly');
    });
  });

  test('Login fails with invalid password', ({ given, when, then }) => {
    given(
      /^a user exists with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        await createUserViaService(email, password);
      },
    );

    when(/^I login with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(getApp().getHttpServer())
        .post('/auth/login')
        .set('X-CSRF-Protection', '1')
        .send({ email, password });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Login fails with non-existent email', ({ when, then }) => {
    when(/^I login with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(getApp().getHttpServer())
        .post('/auth/login')
        .set('X-CSRF-Protection', '1')
        .send({ email, password });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

defineFeature(logoutFeature, (test) => {
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

  test('Successful logout clears the auth cookie', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I request to logout', async () => {
      response = await request(getApp().getHttpServer())
        .post('/auth/logout')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the "(.*)" cookie should be cleared$/, (cookieName: string) => {
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const tokenCookie = (Array.isArray(cookies) ? cookies : [cookies]).find((c: string) =>
        c.startsWith(`${cookieName}=`),
      );
      expect(tokenCookie).toBeDefined();
      // Cleared cookie should have an empty value or expired date
      expect(tokenCookie).toMatch(/token=;|Expires=Thu, 01 Jan 1970/);
    });
  });
});

defineFeature(meFeature, (test) => {
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

  test('Authenticated user retrieves their profile', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I request my profile', async () => {
      response = await request(getApp().getHttpServer())
        .get('/auth/me')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a user with email "(.*)"$/, (email: string) => {
      expect(response.body.email).toBe(email);
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I request my profile without authentication', async () => {
      response = await request(getApp().getHttpServer()).get('/auth/me');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
