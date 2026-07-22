import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { rdhyPlugin } from '@marketlum/plugin-rdhy';
import {
  bootstrapApp,
  cleanDatabase,
  teardownApp,
  getApp,
  createAuthenticatedUser,
} from '../../setup';
import {
  RdhyCtx,
  makeRdhyCtx,
  createRdhyAgent,
  listPlatforms,
  lookupPlatform,
} from './rdhy-helpers';

const feature = loadFeature(
  path.resolve(__dirname, '../../../../../packages/plugin-rdhy/features/seed.feature'),
);

type StepFn = (regex: RegExp | string, fn: (...args: never[]) => unknown) => void;

defineFeature(feature, (test) => {
  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
  });
  afterAll(async () => {
    await teardownApp();
  });

  const ctx: RdhyCtx = makeRdhyCtx();
  beforeEach(() => {
    Object.assign(ctx, makeRdhyCtx());
  });

  function registerAgentExists(step: StepFn) {
    step(
      /^an agent exists with name "(.*)"$/,
      async (name: string) => {
        await createRdhyAgent(ctx, name);
      },
    );
  }

  function registerSeedRuns(step: StepFn, pattern: RegExp) {
    step(pattern, async () => {
      await rdhyPlugin.seed!(getApp().get(DataSource));
    });
  }

  test('The seed hook creates sample platforms and assigns agents idempotently', ({
    given,
    and,
    when,
    then,
  }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      ctx.authCookie = await createAuthenticatedUser(email, 'password123');
    });
    registerAgentExists(given);
    registerAgentExists(and);
    registerSeedRuns(when, /^the RDHY plugin seed hook runs$/);
    registerSeedRuns(and, /^the RDHY plugin seed hook runs again$/);
    then(
      /^the RDHY platform "(.*)" exists with name "(.*)"$/,
      async (code: string, name: string) => {
        const res = await listPlatforms(ctx);
        expect(res.status).toBe(200);
        const platforms = res.body.filter((p: { code: string }) => p.code === code);
        expect(platforms).toHaveLength(1);
        expect(platforms[0].name).toBe(name);
      },
    );
    and(
      /^the RDHY platform "(.*)" exists with name "(.*)"$/,
      async (code: string, name: string) => {
        const res = await listPlatforms(ctx);
        expect(res.status).toBe(200);
        const platforms = res.body.filter((p: { code: string }) => p.code === code);
        expect(platforms).toHaveLength(1);
        expect(platforms[0].name).toBe(name);
      },
    );
    and(/^the agent "(.*)" is assigned to an RDHY platform$/, async (code: string) => {
      const res = await lookupPlatform(ctx, code);
      expect(res.status).toBe(200);
      expect(res.body.platform).not.toBeNull();
    });
    and(/^the agent "(.*)" is assigned to an RDHY platform$/, async (code: string) => {
      const res = await lookupPlatform(ctx, code);
      expect(res.status).toBe(200);
      expect(res.body.platform).not.toBeNull();
    });
  });

  test('The seed hook creates the sample VAM agreements idempotently', ({
    given,
    and,
    when,
    then,
  }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      ctx.authCookie = await createAuthenticatedUser(email, 'password123');
    });
    registerAgentExists(given);
    registerSeedRuns(when, /^the RDHY plugin seed hook runs$/);
    registerSeedRuns(and, /^the RDHY plugin seed hook runs again$/);

    async function expectSingleAgreement(
      title: string,
      status: string,
      milestones: number,
    ): Promise<void> {
      const server = getApp().getHttpServer();
      const list = await request(server)
        .get('/plugins/rdhy/vam-agreements')
        .set('Cookie', [ctx.authCookie]);
      expect(list.status).toBe(200);
      const matches = list.body.filter((a: { title: string }) => a.title === title);
      expect(matches).toHaveLength(1);
      expect(matches[0].status).toBe(status);
      const doc = await request(server)
        .get(`/plugins/rdhy/vam-agreements/${matches[0].id}`)
        .set('Cookie', [ctx.authCookie]);
      expect(doc.status).toBe(200);
      expect(doc.body.canvas.milestones).toHaveLength(milestones);
    }

    then(
      /^exactly one VAM agreement titled "(.*)" exists with status "(.*)" and (\d+) milestones$/,
      async (title: string, status: string, milestones: string) => {
        await expectSingleAgreement(title, status, Number(milestones));
      },
    );
    and(
      /^exactly one VAM agreement titled "(.*)" exists with status "(.*)" and (\d+) milestones$/,
      async (title: string, status: string, milestones: string) => {
        await expectSingleAgreement(title, status, Number(milestones));
      },
    );
  });

  test('The seed hook creates the sample EMC agreement idempotently', ({
    given,
    and,
    when,
    then,
  }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      ctx.authCookie = await createAuthenticatedUser(email, 'password123');
    });
    registerAgentExists(given);
    registerAgentExists(and);
    registerAgentExists(and);
    registerSeedRuns(when, /^the RDHY plugin seed hook runs$/);
    registerSeedRuns(and, /^the RDHY plugin seed hook runs again$/);
    then(
      /^exactly one EMC agreement titled "(.*)" exists with status "(.*)" and (\d+) micro-nodes$/,
      async (title: string, status: string, nodes: string) => {
        const server = getApp().getHttpServer();
        const list = await request(server)
          .get('/plugins/rdhy/emc-agreements')
          .set('Cookie', [ctx.authCookie]);
        expect(list.status).toBe(200);
        const matches = list.body.filter((a: { title: string }) => a.title === title);
        expect(matches).toHaveLength(1);
        expect(matches[0].status).toBe(status);
        const doc = await request(server)
          .get(`/plugins/rdhy/emc-agreements/${matches[0].id}`)
          .set('Cookie', [ctx.authCookie]);
        expect(doc.status).toBe(200);
        expect(doc.body.canvas.nodes).toHaveLength(Number(nodes));
      },
    );
  });
});
