import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import {
  bootstrapApp,
  cleanDatabase,
  teardownApp,
  getApp,
  createUserViaService,
} from '../setup';

const feature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/auth/csrf-protection.feature'),
);

defineFeature(feature, (test) => {
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

  test('POST with CSRF header succeeds', ({ given, when, then }) => {
    given(
      /^a user exists with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        await createUserViaService(email, password);
      },
    );

    when(
      /^I login with email "(.*)" and password "(.*)" including the CSRF header$/,
      async (email: string, password: string) => {
        response = await request(getApp().getHttpServer())
          .post('/auth/login')
          .set('X-CSRF-Protection', '1')
          .send({ email, password });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('POST without CSRF header is rejected', ({ given, when, then }) => {
    given(
      /^a user exists with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        await createUserViaService(email, password);
      },
    );

    when(
      /^I login with email "(.*)" and password "(.*)" without the CSRF header$/,
      async (email: string, password: string) => {
        response = await request(getApp().getHttpServer())
          .post('/auth/login')
          .send({ email, password });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('GET without CSRF header succeeds', ({ when, then }) => {
    when(
      /^I send a GET request to "(.*)" without the CSRF header$/,
      async (url: string) => {
        response = await request(getApp().getHttpServer()).get(url);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('DELETE without CSRF header is rejected', ({ when, then }) => {
    when(
      /^I send a DELETE request to "(.*)" without the CSRF header$/,
      async (url: string) => {
        response = await request(getApp().getHttpServer()).delete(url);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('PATCH without CSRF header is rejected', ({ when, then }) => {
    when(
      /^I send a PATCH request to "(.*)" without the CSRF header$/,
      async (url: string) => {
        response = await request(getApp().getHttpServer()).patch(url);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
