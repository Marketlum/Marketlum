import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { bootstrapApp, cleanDatabase, teardownApp, getApp, createAuthenticatedUser } from '../../setup';
import { createPlatform, createRdhyAgent } from './rdhy-helpers';
import {
  EmcCtx,
  makeEmcCtx,
  createEmcAgreement,
  getEmcAgreement,
  patchEmcAgreement,
  putEmcCanvas,
  transitionEmcAgreement,
  sampleEmcCanvas,
  minimalEmcCanvas,
} from './emc-helpers';

const feature = loadFeature(
  path.resolve(__dirname, '../../../../../packages/plugin-rdhy/features/emc-canvas.feature'),
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

  const ctx: EmcCtx = makeEmcCtx();
  beforeEach(() => {
    Object.assign(ctx, makeEmcCtx());
  });

  function registerBackground(given: StepFn, and: StepFn) {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      ctx.authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(
      /^an RDHY platform exists with code "(.*)" and name "(.*)"$/,
      async (code: string, name: string) => {
        await createPlatform(ctx, code, name);
      },
    );
    const agentExists = (step: StepFn) =>
      step(
        /^an agent exists with name "(.*)"$/,
        async (name: string) => {
          await createRdhyAgent(ctx, name);
        },
      );
    agentExists(and);
    agentExists(and);
    agentExists(and);
    and(
      /^an EMC agreement titled "(.*)" exists sponsored by "(.*)"$/,
      async (title: string, platformCode: string) => {
        const res = await createEmcAgreement(ctx, title, platformCode);
        expect(res.status).toBe(201);
      },
    );
  }

  function registerStatus(then: StepFn) {
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(Number(status));
    });
  }

  function registerReplaceWithSample(when: StepFn) {
    when(
      /^I replace the canvas of the EMC agreement "(.*)" with the sample canvas$/,
      async (title: string) => {
        ctx.response = await putEmcCanvas(ctx, title, sampleEmcCanvas(ctx));
      },
    );
  }

  function registerReplacedGiven(step: StepFn) {
    step(
      /^the canvas of the EMC agreement "(.*)" is replaced with the sample canvas$/,
      async (title: string) => {
        const res = await putEmcCanvas(ctx, title, sampleEmcCanvas(ctx));
        expect(res.status).toBe(200);
      },
    );
  }

  function registerCounts(step: StepFn) {
    step(
      /^the EMC canvas has (\d+) micro-nodes, (\d+) services, (\d+) goals, (\d+) cost entries and (\d+) termination conditions$/,
      (nodes: string, services: string, goals: string, costs: string, terms: string) => {
        const canvas = ctx.response.body.canvas;
        expect(canvas.nodes).toHaveLength(Number(nodes));
        const flat = (key: 'services' | 'goals' | 'costEntries') =>
          canvas.nodes.reduce(
            (sum: number, n: Record<typeof key, unknown[]>) => sum + n[key].length,
            0,
          );
        expect(flat('services')).toBe(Number(services));
        expect(flat('goals')).toBe(Number(goals));
        expect(flat('costEntries')).toBe(Number(costs));
        expect(canvas.terminationConditions).toHaveLength(Number(terms));
      },
    );
  }

  test('Replacing the canvas populates all sections in order', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerReplaceWithSample(when);
    registerStatus(then);
    registerCounts(and);
    and(/^the EMC canvas micro-nodes are ordered "(.*)"$/, (codes: string) => {
      const expected = codes.split(',').map((c) => c.trim());
      const actual = ctx.response.body.canvas.nodes.map(
        (n: { agent: { name: string } }) => n.agent.name,
      );
      expect(actual).toEqual(expected);
    });
    and(
      /^the EMC canvas micro-node "(.*)" is the leading node with a (\d+) percent share$/,
      (code: string, percent: string) => {
        const found = ctx.response.body.canvas.nodes.find(
          (n: { agent: { name: string } }) => n.agent.name === code,
        );
        expect(found).toBeDefined();
        expect(found.isLeading).toBe(true);
        expect(Number(found.profitSharePercent)).toBe(Number(percent));
      },
    );
  });

  test('Re-replacing the canvas discards the previous content', ({ given, and, when, then }) => {
    registerBackground(given, and);
    registerReplacedGiven(given);
    when(
      /^I replace the canvas of the EMC agreement "(.*)" with the minimal canvas$/,
      async (title: string) => {
        ctx.response = await putEmcCanvas(ctx, title, minimalEmcCanvas(ctx));
      },
    );
    registerStatus(then);
    registerCounts(and);
  });

  test('A canvas with nodes but no leading node is rejected', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(
      /^I replace the canvas of the EMC agreement "(.*)" with a canvas where no node is leading$/,
      async (title: string) => {
        const canvas = sampleEmcCanvas(ctx);
        canvas.nodes.forEach((n) => (n.isLeading = false));
        ctx.response = await putEmcCanvas(ctx, title, canvas);
      },
    );
    registerStatus(then);
  });

  test('A canvas with two leading nodes is rejected', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(
      /^I replace the canvas of the EMC agreement "(.*)" with a canvas where two nodes are leading$/,
      async (title: string) => {
        const canvas = sampleEmcCanvas(ctx);
        canvas.nodes[1].isLeading = true;
        ctx.response = await putEmcCanvas(ctx, title, canvas);
      },
    );
    registerStatus(then);
  });

  test('A tactical leading node is rejected', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(
      /^I replace the canvas of the EMC agreement "(.*)" with a canvas where a tactical node is leading$/,
      async (title: string) => {
        const canvas = sampleEmcCanvas(ctx);
        canvas.nodes[0].isLeading = false;
        canvas.nodes[2].isLeading = true; // the tactical legal node
        ctx.response = await putEmcCanvas(ctx, title, canvas);
      },
    );
    registerStatus(then);
  });

  test('A profit share on a tactical node is rejected', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(
      /^I replace the canvas of the EMC agreement "(.*)" with a canvas where a tactical node has a profit share$/,
      async (title: string) => {
        const canvas = sampleEmcCanvas(ctx);
        canvas.nodes[2].profitSharePercent = 5;
        ctx.response = await putEmcCanvas(ctx, title, canvas);
      },
    );
    registerStatus(then);
  });

  test('Profit shares exceeding the available pool are rejected', ({ given, and, when, then }) => {
    registerBackground(given, and);
    given(
      /^the EMC agreement "(.*)" has a reinvestment share of (\d+) percent$/,
      async (title: string, percent: string) => {
        const res = await patchEmcAgreement(ctx, title, { reinvestmentPercent: Number(percent) });
        expect(res.status).toBe(200);
      },
    );
    when(
      /^I replace the canvas of the EMC agreement "(.*)" with a canvas whose profit shares sum to (\d+) percent$/,
      async (title: string, sum: string) => {
        const canvas = sampleEmcCanvas(ctx);
        canvas.nodes[0].profitSharePercent = Number(sum) - 7; // dev node keeps its 7%
        ctx.response = await putEmcCanvas(ctx, title, canvas);
      },
    );
    registerStatus(then);
  });

  test('Duplicate micro-nodes for the same agent are rejected', ({
    given,
    and,
    when,
    then,
  }) => {
    registerBackground(given, and);
    when(
      /^I replace the canvas of the EMC agreement "(.*)" with a canvas containing the agent "(.*)" twice$/,
      async (title: string, code: string) => {
        const canvas = sampleEmcCanvas(ctx);
        canvas.nodes[1].agentId = ctx.agents.get(code);
        ctx.response = await putEmcCanvas(ctx, title, canvas);
      },
    );
    registerStatus(then);
  });

  test('A micro-node for an unknown agent is rejected', ({ given, and, when, then }) => {
    registerBackground(given, and);
    when(
      /^I replace the canvas of the EMC agreement "(.*)" with a canvas containing an unknown agent$/,
      async (title: string) => {
        const canvas = sampleEmcCanvas(ctx);
        canvas.nodes[1].agentId = randomUUID();
        ctx.response = await putEmcCanvas(ctx, title, canvas);
      },
    );
    registerStatus(then);
  });

  test('Canvas edits are rejected once active', ({ given, and, when, then }) => {
    registerBackground(given, and);
    given(/^the EMC agreement "(.*)" is activated$/, async (title: string) => {
      const res = await transitionEmcAgreement(ctx, title, 'activate');
      expect(res.status).toBe(200);
    });
    registerReplaceWithSample(when);
    registerStatus(then);
  });

  test('Deleting an agent through core removes its micro-node', ({
    given,
    and,
    when,
    then,
  }) => {
    registerBackground(given, and);
    registerReplacedGiven(given);
    when(/^I delete the agent "(.*)" through the core API$/, async (code: string) => {
      ctx.response = await request(getApp().getHttpServer())
        .delete(`/agents/${ctx.agents.get(code)}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1');
      expect(ctx.response.status).toBe(204);
    });
    and(/^I fetch the EMC agreement "(.*)"$/, async (title: string) => {
      ctx.response = await getEmcAgreement(ctx, title);
    });
    registerStatus(then);
    registerCounts(and);
  });
});
