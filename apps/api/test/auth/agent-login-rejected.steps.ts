import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@marketlum/core';
import { UserType } from '@marketlum/shared';
import { bootstrapApp, cleanDatabase, teardownApp, getApp } from '../setup';

const feature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/auth/agent-login-rejected.feature'),
);

defineFeature(feature, (test) => {
  let response: request.Response;
  let agentUserId: string;
  let agentEmail: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownApp();
  });

  async function createAgent(email: string): Promise<void> {
    const usersService = getApp().get(UsersService);
    const agent = await usersService.create({
      name: 'Pricing Bot',
      email,
      type: UserType.AGENT,
    });
    agentUserId = agent.id;
    agentEmail = email;
  }

  test('Password login as an agent user is rejected', ({ given, when, then }) => {
    given(/^an agent user exists with email "(.*)"$/, async (email: string) => {
      await createAgent(email);
    });

    when(
      /^I attempt to log in as "(.*)" with password "(.*)"$/,
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

  test('A JWT cookie for an agent user is rejected', ({ given, when, then }) => {
    given(/^an agent user exists with email "(.*)"$/, async (email: string) => {
      await createAgent(email);
    });

    when('I request my profile with a JWT cookie minted for that agent user', async () => {
      // A validly signed token — the rejection must come from the strategy's
      // agent check, not from signature validation.
      const jwt = getApp()
        .get(JwtService)
        .sign({ sub: agentUserId, email: agentEmail });
      response = await request(getApp().getHttpServer())
        .get('/auth/me')
        .set('Cookie', [`token=${jwt}`]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
