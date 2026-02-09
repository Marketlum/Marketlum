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

const feature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/auth/throttling.feature'),
);

defineFeature(feature, (test) => {
  let responses: request.Response[];
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    responses = [];
    authCookie = '';
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Login endpoint is throttled after 5 requests', ({ given, when, then, and }) => {
    given(
      /^a user exists with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        await createUserViaService(email, password);
      },
    );

    when(
      /^I send (\d+) login requests with email "(.*)" and password "(.*)"$/,
      async (count: string, email: string, password: string) => {
        for (let i = 0; i < parseInt(count); i++) {
          const res = await request(getApp().getHttpServer())
            .post('/auth/login')
            .send({ email, password });
          responses.push(res);
        }
      },
    );

    then(/^the first (\d+) responses should have status (\d+)$/, (count: string, status: string) => {
      const n = parseInt(count);
      const s = parseInt(status);
      for (let i = 0; i < n; i++) {
        expect(responses[i].status).toBe(s);
      }
    });

    and(/^the 6th response should have status (\d+)$/, (status: string) => {
      expect(responses[5].status).toBe(parseInt(status));
    });
  });

  test('General API endpoints are throttled after 100 requests', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I send (\d+) requests to "(.*)"$/, async (count: string, endpoint: string) => {
      const [method, url] = endpoint.split(' ');
      const server = getApp().getHttpServer();
      for (let i = 0; i < parseInt(count); i++) {
        const res = method === 'GET'
          ? await request(server).get(url).set('Cookie', [authCookie])
          : await request(server).post(url).set('Cookie', [authCookie]);
        responses.push(res);
      }
    });

    then(/^the first (\d+) responses should have status (\d+)$/, (count: string, status: string) => {
      const n = parseInt(count);
      const s = parseInt(status);
      for (let i = 0; i < n; i++) {
        expect(responses[i].status).toBe(s);
      }
    });

    and(/^the 101st response should have status (\d+)$/, (status: string) => {
      expect(responses[100].status).toBe(parseInt(status));
    });
  });
});
