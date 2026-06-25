import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment before anything else
dotenv.config({ path: path.resolve(__dirname, '../../../.env.test') });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { TestAppModule } from './test-app.module';
import { DataSource } from 'typeorm';
import { UsersService } from '@marketlum/core';
import { NbpClient } from '@marketlum/plugin-nbp';
import { EventRecorder } from './event-recorder';
import { FakeNbpClient } from './plugins/nbp/fake-nbp-client';

const fakeNbpClient = new FakeNbpClient();

export function getFakeNbpClient(): FakeNbpClient {
  return fakeNbpClient;
}

let app: INestApplication;
let dataSource: DataSource;
let refCount = 0;

export async function bootstrapApp(): Promise<INestApplication> {
  refCount++;
  if (app) return app;

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [TestAppModule],
    providers: [EventRecorder],
  })
    .overrideProvider(NbpClient)
    .useValue(fakeNbpClient)
    .compile();

  app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  await app.init();

  dataSource = moduleFixture.get(DataSource);

  // Run migrations so the test DB schema is always up to date
  await dataSource.runMigrations();

  return app;
}

export async function cleanDatabase(): Promise<void> {
  if (!dataSource) return;

  const entities = dataSource.entityMetadatas;
  const tableNames = entities.map((e) => `"${e.tableName}"`).join(', ');
  if (tableNames) {
    await dataSource.query(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`);
  }

  // Reset the NBP test double so seeded rates don't carry between scenarios
  fakeNbpClient.reset();

  // Reset throttle storage so rate limits don't carry between test scenarios
  try {
    const throttlerStorage = app.get<{ storage: Map<string, unknown> }>(ThrottlerStorage);
    throttlerStorage.storage.clear();
  } catch {
    // ThrottlerStorage may not be available in some contexts
  }

  try {
    app.get(EventRecorder).clear();
  } catch {
    // EventRecorder may not be registered in some contexts
  }
}

export function getEventRecorder(): EventRecorder {
  return app.get(EventRecorder);
}

export async function teardownApp(): Promise<void> {
  refCount--;
  if (refCount <= 0 && app) {
    await app.close();
    app = undefined as unknown as INestApplication;
  }
}

export function getApp(): INestApplication {
  return app;
}

export async function createUserViaService(
  email: string,
  password: string,
  name = 'Test User',
) {
  const usersService = app.get(UsersService);
  return usersService.create({ email, password, name });
}

let codeCounter = 0;

export function randomCode(prefix = 'test'): string {
  codeCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${codeCounter}`.slice(0, 64);
}

// Auto-inject a snake_case `code` field into POSTs to entity routes that require
// one (spec 008 made `code` NOT NULL across 8 tables). Tests that explicitly
// set a code override this default. Scenarios that test invalid bodies (e.g.
// missing required fields) are unaffected because they keep their own body shape.
const ENTITY_ROUTES = /\/(values|value-instances|taxonomies|channels|value-streams|agreement-templates|pipelines|archetypes)(\?|$|\/(?!by-code))/;

const TestProto = (request as unknown as { Test: { prototype: { send: (body: unknown) => unknown; method?: string; url?: string } } }).Test.prototype;
const originalSend = TestProto.send;
TestProto.send = function (body: unknown) {
  if (
    body !== null &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    (this.method === 'POST' || (this as unknown as { req?: { method?: string } }).req?.method === 'POST') &&
    typeof this.url === 'string' &&
    ENTITY_ROUTES.test(this.url) &&
    !('code' in (body as Record<string, unknown>))
  ) {
    body = { ...(body as Record<string, unknown>), code: randomCode('t') };
  }
  return originalSend.call(this, body);
};

export async function createAuthenticatedUser(
  email: string,
  password: string,
  name = 'Admin',
): Promise<string> {
  // Create user directly via service to avoid auth chicken-and-egg
  const usersService = app.get(UsersService);
  await usersService.create({ email, password, name });

  // Login to get token cookie
  const loginRes = await request(getApp().getHttpServer())
    .post('/auth/login')
    .set('X-CSRF-Protection', '1')
    .send({ email, password });

  const cookies = loginRes.headers['set-cookie'];
  if (!cookies) return '';

  const tokenCookie = (Array.isArray(cookies) ? cookies : [cookies]).find((c: string) =>
    c.startsWith('token='),
  );
  return tokenCookie || '';
}
