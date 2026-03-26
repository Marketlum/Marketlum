import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import {
  bootstrapApp,
  cleanDatabase,
  teardownApp,
  getApp,
  createAuthenticatedUser,
  createUserViaService,
} from '../setup';
import { ValuesService, ValueInstancesService, AgentsService } from '@marketlum/core';

const feature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/search/global-search.feature'),
);

defineFeature(feature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    authCookie = '';
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Search returns matching values by name', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a value named "(.*)" exists$/, async (name: string) => {
      const valuesService = getApp().get(ValuesService);
      await valuesService.create({ name, type: 'product' as any });
    });

    when(/^I search for "(.*)"$/, async (query: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/search?q=${encodeURIComponent(query)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the search results should contain (\d+) items?$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(
      /^the search results should include an? "(.*)" named "(.*)"$/,
      (type: string, name: string) => {
        const found = response.body.data.some(
          (r: any) => r.type === type && r.name === name,
        );
        expect(found).toBe(true);
      },
    );
  });

  test('Search returns matching agents by name', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent named "(.*)" exists$/, async (name: string) => {
      const agentsService = getApp().get(AgentsService);
      await agentsService.create({ name, type: 'organization' as any });
    });

    when(/^I search for "(.*)"$/, async (query: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/search?q=${encodeURIComponent(query)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the search results should contain (\d+) items?$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(
      /^the search results should include an? "(.*)" named "(.*)"$/,
      (type: string, name: string) => {
        const found = response.body.data.some(
          (r: any) => r.type === type && r.name === name,
        );
        expect(found).toBe(true);
      },
    );
  });

  test('Search returns matching users by name', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a user named "(.*)" with email "(.*)" exists$/,
      async (name: string, email: string) => {
        await createUserViaService(email, 'password123', name);
      },
    );

    when(/^I search for "(.*)"$/, async (query: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/search?q=${encodeURIComponent(query)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the search results should contain (\d+) items?$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(
      /^the search results should include an? "(.*)" named "(.*)"$/,
      (type: string, name: string) => {
        const found = response.body.data.some(
          (r: any) => r.type === type && r.name === name,
        );
        expect(found).toBe(true);
      },
    );
  });

  test('Search returns matching users by email', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      /^a user named "(.*)" with email "(.*)" exists$/,
      async (name: string, email: string) => {
        await createUserViaService(email, 'password123', name);
      },
    );

    when(/^I search for "(.*)"$/, async (query: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/search?q=${encodeURIComponent(query)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the search results should contain (\d+) items?$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(
      /^the search results should include an? "(.*)" named "(.*)"$/,
      (type: string, name: string) => {
        const found = response.body.data.some(
          (r: any) => r.type === type && r.name === name,
        );
        expect(found).toBe(true);
      },
    );
  });

  test('Search returns results from multiple entity types', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a value named "(.*)" exists$/, async (name: string) => {
      const valuesService = getApp().get(ValuesService);
      await valuesService.create({ name, type: 'product' as any });
    });

    and(/^an agent named "(.*)" exists$/, async (name: string) => {
      const agentsService = getApp().get(AgentsService);
      await agentsService.create({ name, type: 'organization' as any });
    });

    when(/^I search for "(.*)"$/, async (query: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/search?q=${encodeURIComponent(query)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the search results should contain (\d+) items?$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(
      /^the search results should include an? "(.*)" named "(.*)"$/,
      (type: string, name: string) => {
        const found = response.body.data.some(
          (r: any) => r.type === type && r.name === name,
        );
        expect(found).toBe(true);
      },
    );

    and(
      /^the search results should include an? "(.*)" named "(.*)"$/,
      (type: string, name: string) => {
        const found = response.body.data.some(
          (r: any) => r.type === type && r.name === name,
        );
        expect(found).toBe(true);
      },
    );
  });

  test('Search with no matches returns empty results', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I search for "(.*)"$/, async (query: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/search?q=${encodeURIComponent(query)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the search results should contain (\d+) items?$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Search ranks name matches higher than purpose matches', ({
    given,
    and,
    when,
    then,
  }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a value named "(.*)" exists$/, async (name: string) => {
      const valuesService = getApp().get(ValuesService);
      await valuesService.create({ name, type: 'product' as any });
    });

    and(
      /^an agent named "(.*)" with purpose "(.*)" exists$/,
      async (name: string, purpose: string) => {
        const agentsService = getApp().get(AgentsService);
        await agentsService.create({
          name,
          type: 'organization' as any,
          purpose,
        });
      },
    );

    when(/^I search for "(.*)"$/, async (query: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/search?q=${encodeURIComponent(query)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the search results should contain (\d+) items?$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(
      /^the first search result should be the "(.*)" named "(.*)"$/,
      (type: string, name: string) => {
        expect(response.body.data[0].type).toBe(type);
        expect(response.body.data[0].name).toBe(name);
      },
    );
  });

  test('Search results respect limit parameter', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a value named "(.*)" exists$/, async (name: string) => {
      const valuesService = getApp().get(ValuesService);
      await valuesService.create({ name, type: 'product' as any });
    });

    and(/^a value named "(.*)" exists$/, async (name: string) => {
      const valuesService = getApp().get(ValuesService);
      await valuesService.create({ name, type: 'product' as any });
    });

    and(/^a value named "(.*)" exists$/, async (name: string) => {
      const valuesService = getApp().get(ValuesService);
      await valuesService.create({ name, type: 'product' as any });
    });

    when(/^I search for "(.*)" with limit (\d+)$/, async (query: string, limit: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/search?q=${encodeURIComponent(query)}&limit=${limit}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the search results should contain (\d+) items?$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });
  });

  test('Search returns matching value instances by name', ({ given, and, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a value instance named "(.*)" exists$/, async (name: string) => {
      const valuesService = getApp().get(ValuesService);
      const value = await valuesService.create({ name: 'Test Value', type: 'product' as any });
      const viService = getApp().get(ValueInstancesService);
      await viService.create({ name, valueId: value.id });
    });

    when(/^I search for "(.*)"$/, async (query: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/search?q=${encodeURIComponent(query)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the search results should contain (\d+) items?$/, (count: string) => {
      expect(response.body.data).toHaveLength(parseInt(count));
    });

    and(
      /^the search results should include an? "(.*)" named "(.*)"$/,
      (type: string, name: string) => {
        const found = response.body.data.some(
          (r: any) => r.type === type && r.name === name,
        );
        expect(found).toBe(true);
      },
    );
  });

  test('Unauthenticated search is rejected', ({ when, then }) => {
    when(/^I search for "(.*)"$/, async (query: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/search?q=${encodeURIComponent(query)}`)
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
