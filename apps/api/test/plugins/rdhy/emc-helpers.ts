import request from 'supertest';
import { getApp } from '../../setup';
import { RdhyCtx, makeRdhyCtx } from './rdhy-helpers';

export interface EmcCtx extends RdhyCtx {
  agreements: Map<string, string>; // agreement title -> id
}

export const makeEmcCtx = (): EmcCtx => ({ ...makeRdhyCtx(), agreements: new Map() });

function server() {
  return getApp().getHttpServer();
}

interface EmcCanvasNode {
  agentId: string | undefined;
  tier: 'STRATEGIC' | 'TACTICAL';
  isLeading: boolean;
  profitSharePercent: number | null;
  services: string[];
  goals: string[];
  costEntries: Array<{ label: string; amount: number; headcount?: number | null }>;
}

function node(
  ctx: EmcCtx,
  agentName: string,
  overrides: Partial<EmcCanvasNode> = {},
): EmcCanvasNode {
  return {
    agentId: ctx.agents.get(agentName),
    tier: 'STRATEGIC',
    isLeading: false,
    profitSharePercent: null,
    services: [],
    goals: [],
    costEntries: [],
    ...overrides,
  };
}

/** 3 micro-nodes (leading hub 10%, dev 7%, tactical legal), 4 services,
 * 4 goals, 4 cost entries and 2 termination conditions. */
export function sampleEmcCanvas(ctx: EmcCtx) {
  return {
    nodes: [
      node(ctx, 'Web3 Consulting Hub', {
        isLeading: true,
        profitSharePercent: 10,
        services: ['Defining the DAO protocol', 'Selling the service to clients'],
        goals: ['Guaranteeing the minimum number of clients', 'Contracts signed within 45 days'],
        costEntries: [
          { label: '2 FTEs', amount: 0, headcount: 2 },
          { label: 'Operating budget', amount: 150000 },
        ],
      }),
      node(ctx, 'Web3 Development', {
        profitSharePercent: 7,
        services: ['Implementing the DAO code following the given specs'],
        goals: ['Code online within 90 days'],
        costEntries: [{ label: '3 FTEs', amount: 210000, headcount: 3 }],
      }),
      node(ctx, 'Legal Counseling', {
        tier: 'TACTICAL',
        services: ['Drafting the agreements for all the parties in the EMC'],
        goals: ['Contracts ready within 30 days'],
        costEntries: [{ label: '2 FTEs', amount: 140000, headcount: 2 }],
      }),
    ],
    terminationConditions: [
      'Terminated if the collaborative goals are missed by more than 15%',
      'Terminated when the governance model fails to resolve an objection within 60 days',
    ],
  };
}

/** A single leading strategic node with one service and nothing else. */
export function minimalEmcCanvas(ctx: EmcCtx) {
  return {
    nodes: [
      node(ctx, 'Web3 Consulting Hub', {
        isLeading: true,
        services: ['Defining the DAO protocol'],
      }),
    ],
    terminationConditions: [],
  };
}

export async function createEmcAgreement(
  ctx: EmcCtx,
  title: string,
  platformCode: string,
  reinvestmentPercent?: number,
): Promise<request.Response> {
  const res = await request(server())
    .post('/plugins/rdhy/emc-agreements')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({
      title,
      platformId: ctx.platforms.get(platformCode),
      ...(reinvestmentPercent !== undefined ? { reinvestmentPercent } : {}),
    });
  if (res.status === 201) ctx.agreements.set(title, res.body.id);
  return res;
}

export async function getEmcAgreement(ctx: EmcCtx, title: string): Promise<request.Response> {
  return request(server())
    .get(`/plugins/rdhy/emc-agreements/${ctx.agreements.get(title)}`)
    .set('Cookie', [ctx.authCookie]);
}

export async function patchEmcAgreement(
  ctx: EmcCtx,
  title: string,
  body: object,
): Promise<request.Response> {
  return request(server())
    .patch(`/plugins/rdhy/emc-agreements/${ctx.agreements.get(title)}`)
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
}

export async function putEmcCanvas(
  ctx: EmcCtx,
  title: string,
  canvas: unknown,
): Promise<request.Response> {
  return request(server())
    .put(`/plugins/rdhy/emc-agreements/${ctx.agreements.get(title)}/canvas`)
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send(canvas as object);
}

export async function transitionEmcAgreement(
  ctx: EmcCtx,
  title: string,
  action: 'activate' | 'complete' | 'terminate',
  body?: object,
): Promise<request.Response> {
  return request(server())
    .post(`/plugins/rdhy/emc-agreements/${ctx.agreements.get(title)}/${action}`)
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body ?? {});
}

export async function emcTerminationRuleIds(ctx: EmcCtx, title: string): Promise<string[]> {
  const res = await getEmcAgreement(ctx, title);
  expect(res.status).toBe(200);
  return res.body.canvas.terminationConditions.map((r: { id: string }) => r.id);
}
