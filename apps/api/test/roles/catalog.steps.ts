import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import {
  bootstrapApp,
  cleanDatabase,
  teardownApp,
  getApp,
  createAuthenticatedUser,
  createUserWithRoles,
} from '../setup';

const catalogFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/roles/catalog.feature'),
);

defineFeature(catalogFeature, (test) => {
  let response: request.Response;
  let cookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
  });
  afterAll(async () => {
    await teardownApp();
  });

  test('Listing the permission catalog returns core and plugin resources', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      cookie = await createAuthenticatedUser(email, 'password123');
    });
    when('I get the permission catalog', async () => {
      response = await request(getApp().getHttpServer())
        .get('/roles/permission-catalog')
        .set('Cookie', [cookie]);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
    and(/^the catalog should contain the resource "(.*)"$/, (resource: string) => {
      expect(response.body.resources).toContain(resource);
    });
    and(/^the catalog should contain the resource "(.*)"$/, (resource: string) => {
      expect(response.body.resources).toContain(resource);
    });
    and(/^the catalog should contain the resource "(.*)"$/, (resource: string) => {
      expect(response.body.resources).toContain(resource);
    });
  });

  test('The permission catalog requires the roles permission', ({ given, when, then }) => {
    given(/^a user "(.*)" with a role granting "(.*)"$/, async (email: string, grant: string) => {
      const created = await createUserWithRoles(email, 'password123', [
        { code: 'catalog_reader', permissions: [grant] },
      ]);
      cookie = created.cookie;
    });
    when('the user gets the permission catalog', async () => {
      response = await request(getApp().getHttpServer())
        .get('/roles/permission-catalog')
        .set('Cookie', [cookie]);
    });
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
