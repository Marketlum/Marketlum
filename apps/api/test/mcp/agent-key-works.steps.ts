import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { RolesService, UsersService } from '@marketlum/core';
import { bootstrapApp, cleanDatabase, teardownApp, getApp, createAuthenticatedUser } from '../setup';

const feature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/mcp/agent-key-works.feature'),
);

const MCP_ACCEPT = 'application/json, text/event-stream';
let rpcId = 0;

defineFeature(feature, (test) => {
  let response: request.Response;
  let adminCookie: string;
  let agentApiKey: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test("An agent's API key calls MCP tools under its role grants", ({ given, and, when, then }) => {
    given(
      /^an agent user with an "(.*)" role and a provisioned API key$/,
      async (permission: string) => {
        adminCookie = await createAuthenticatedUser('admin@marketlum.com', 'password123');

        const agentRes = await request(getApp().getHttpServer())
          .post('/users')
          .set('Cookie', [adminCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name: 'Pricing Bot', email: 'pricing-bot@marketlum.com', type: 'agent' });
        const agentId = agentRes.body.id;

        const role = await getApp()
          .get(RolesService)
          .create({ name: 'Agent Reader', code: 'agent_reader', parentId: null, permissions: [permission] });
        await getApp().get(UsersService).assignRoles(agentId, [role.id]);

        const keyRes = await request(getApp().getHttpServer())
          .post(`/users/${agentId}/api-keys`)
          .set('Cookie', [adminCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name: 'bot-key' });
        agentApiKey = keyRes.body.key;
      },
    );

    and(
      /^an actor exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        await request(getApp().getHttpServer())
          .post('/actors')
          .set('Cookie', [adminCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, type });
      },
    );

    when(
      /^the agent calls the "(.*)" MCP tool searching for "(.*)"$/,
      async (tool: string, query: string) => {
        rpcId += 1;
        response = await request(getApp().getHttpServer())
          .post('/mcp')
          .set('Accept', MCP_ACCEPT)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${agentApiKey}`)
          .send({
            jsonrpc: '2.0',
            id: rpcId,
            method: 'tools/call',
            params: { name: tool, arguments: { query } },
          });
      },
    );

    then('the MCP tool call succeeds', () => {
      expect(response.status).toBe(200);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.isError).toBeFalsy();
    });

    and(/^the MCP result contains the actor "(.*)"$/, (name: string) => {
      const payload = JSON.parse(response.body.result.content[0].text);
      const names = JSON.stringify(payload);
      expect(names).toContain(name);
    });
  });
});
