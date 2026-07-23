import request from 'supertest';
import { getApp } from '../../setup';
import { RdhyCtx, makeRdhyCtx } from './rdhy-helpers';

export interface VamCtx extends RdhyCtx {
  agreements: Map<string, string>; // agreement title -> id
}

export const makeVamCtx = (): VamCtx => ({ ...makeRdhyCtx(), agreements: new Map() });

function server() {
  return getApp().getHttpServer();
}

export const SAMPLE_CANVAS = {
  milestones: [
    {
      offsetMonths: 3,
      label: null,
      items: [{ track: 'DIRECT_VALUE', description: 'All offerings prepared', amount: null }],
    },
    {
      offsetMonths: 6,
      label: null,
      items: [
        { track: 'DIRECT_VALUE', description: 'First 2 projects sold', amount: null },
        { track: 'VARIABLE_PAY', description: '$50K bonus for owners', amount: 50000 },
      ],
    },
    {
      offsetMonths: 9,
      label: null,
      items: [
        { track: 'INDIRECT_VALUE', description: 'Network of 50 partners consolidated', amount: null },
        { track: 'PROFIT_SHARING', description: '10% of profit sharing for the team', amount: null },
      ],
    },
    {
      offsetMonths: 12,
      label: null,
      items: [
        { track: 'EQUITY', description: 'Owners invited to acquire 10% of the equity', amount: null },
      ],
    },
  ],
  costEntries: [
    { category: 'LEADERS_SALARY', label: '1 leader', amount: 50000, headcount: 1 },
    { category: 'TEAM_SALARY', label: '3 team members', amount: 90000, headcount: 3 },
  ],
  investmentEntries: [
    { kind: 'CAPITAL_INVESTMENT', label: 'Technology and go-to-market', amount: 200000 },
    { kind: 'TEAM_ALLOWANCE', label: 'Allowance for team members', amount: 45000 },
  ],
  terminationConditions: [
    'Terminated if the leading goals are missed by more than 15%',
    'Terminated when exceeding the cashflow allowance without recovery within 3 months',
  ],
};

export const MINIMAL_CANVAS = {
  milestones: [
    {
      offsetMonths: 3,
      label: null,
      items: [{ track: 'DIRECT_VALUE', description: 'First offering shipped', amount: null }],
    },
  ],
  costEntries: [],
  investmentEntries: [],
  terminationConditions: [],
};

export async function createVamAgreement(
  ctx: VamCtx,
  title: string,
  agentName: string,
  platformCode: string,
  horizonMonths = 12,
  currencyId?: string,
): Promise<request.Response> {
  const res = await request(server())
    .post('/plugins/rdhy/vam-agreements')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({
      title,
      agentId: ctx.agents.get(agentName),
      platformId: ctx.platforms.get(platformCode),
      horizonMonths,
      ...(currencyId ? { currencyId } : {}),
    });
  if (res.status === 201) ctx.agreements.set(title, res.body.id);
  return res;
}

export async function getVamAgreement(ctx: VamCtx, title: string): Promise<request.Response> {
  return request(server())
    .get(`/plugins/rdhy/vam-agreements/${ctx.agreements.get(title)}`)
    .set('Cookie', [ctx.authCookie]);
}

export async function putVamCanvas(
  ctx: VamCtx,
  title: string,
  canvas: unknown,
): Promise<request.Response> {
  return request(server())
    .put(`/plugins/rdhy/vam-agreements/${ctx.agreements.get(title)}/canvas`)
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send(canvas as object);
}

export async function transitionVamAgreement(
  ctx: VamCtx,
  title: string,
  action: 'activate' | 'complete' | 'terminate',
  body?: object,
): Promise<request.Response> {
  return request(server())
    .post(`/plugins/rdhy/vam-agreements/${ctx.agreements.get(title)}/${action}`)
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body ?? {});
}

export async function terminationRuleIds(ctx: VamCtx, title: string): Promise<string[]> {
  const res = await getVamAgreement(ctx, title);
  expect(res.status).toBe(200);
  return res.body.canvas.terminationConditions.map((r: { id: string }) => r.id);
}
