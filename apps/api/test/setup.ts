import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { UsersService } from '../src/users/users.service';

let app: INestApplication;
let dataSource: DataSource;
let refCount = 0;

export async function bootstrapApp(): Promise<INestApplication> {
  refCount++;
  if (app) return app;

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  await app.init();

  dataSource = moduleFixture.get(DataSource);

  return app;
}

export async function cleanDatabase(): Promise<void> {
  if (!dataSource) return;

  const entities = dataSource.entityMetadatas;
  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name);
    await repository.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE`);
  }
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
    .send({ email, password });

  const cookies = loginRes.headers['set-cookie'];
  if (!cookies) return '';

  const tokenCookie = (Array.isArray(cookies) ? cookies : [cookies]).find((c: string) =>
    c.startsWith('token='),
  );
  return tokenCookie || '';
}
