import request from 'supertest';
import { getApp } from '../../setup';

export interface RdhyCtx {
  authCookie: string;
  platforms: Map<string, string>; // platform code -> id
  actors: Map<string, string>; // actor name -> id
  response: request.Response;
}

export const makeRdhyCtx = (): RdhyCtx => ({
  authCookie: '',
  platforms: new Map(),
  actors: new Map(),
  response: undefined as never,
});

function server() {
  return getApp().getHttpServer();
}

export async function createPlatform(ctx: RdhyCtx, code: string, name: string): Promise<void> {
  const res = await request(server())
    .post('/plugins/rdhy/platforms')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ code, name });
  expect(res.status).toBe(201);
  ctx.platforms.set(code, res.body.id);
}

export async function createRdhyActor(ctx: RdhyCtx, name: string): Promise<void> {
  const res = await request(server())
    .post('/actors')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'organization' });
  expect(res.status).toBe(201);
  ctx.actors.set(name, res.body.id);
}

export async function assignActor(
  ctx: RdhyCtx,
  actorName: string,
  platformCode: string,
): Promise<request.Response> {
  return request(server())
    .put(`/plugins/rdhy/actors/${ctx.actors.get(actorName)}/platform`)
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ platformId: ctx.platforms.get(platformCode) });
}

export async function lookupPlatform(
  ctx: RdhyCtx,
  actorName: string,
): Promise<request.Response> {
  return request(server())
    .get(`/plugins/rdhy/actors/${ctx.actors.get(actorName)}/platform`)
    .set('Cookie', [ctx.authCookie]);
}

export async function listPlatforms(ctx: RdhyCtx): Promise<request.Response> {
  return request(server()).get('/plugins/rdhy/platforms').set('Cookie', [ctx.authCookie]);
}

export async function expectMemberCount(
  ctx: RdhyCtx,
  platformCode: string,
  count: number,
): Promise<void> {
  const res = await listPlatforms(ctx);
  expect(res.status).toBe(200);
  const platform = res.body.find((p: { code: string }) => p.code === platformCode);
  expect(platform).toBeDefined();
  expect(platform.memberCount).toBe(count);
}

export async function expectUnassigned(ctx: RdhyCtx, actorName: string): Promise<void> {
  const res = await lookupPlatform(ctx, actorName);
  expect(res.status).toBe(200);
  expect(res.body.platform).toBeNull();
}
