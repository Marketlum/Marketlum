import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { MarketlumApiPlugin, validatePlugins } from '@marketlum/core';
import {
  bootstrapApp,
  cleanDatabase,
  teardownApp,
  getApp,
  createAuthenticatedUser,
} from '../setup';
import { expectEventWithId } from '../events/event-steps';

const featurePath = (name: string) =>
  path.resolve(__dirname, `../../../../packages/bdd/features/plugins/${name}.feature`);

const registrationFeature = loadFeature(featurePath('registration'));
const validationFeature = loadFeature(featurePath('validation'));
const settingsFeature = loadFeature(featurePath('settings'));
const eventsFeature = loadFeature(featurePath('events'));

const EXAMPLE_DEFAULTS = { label: 'Example', enabled: false };
const VALID_SETTINGS = { label: 'Custom', enabled: true };

// --- PLUGIN REGISTRATION ---
defineFeature(registrationFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
  });
  afterAll(async () => {
    await teardownApp();
  });

  const authenticate = (given: any) =>
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

  test('Registered plugins are listed via the API', ({ given, when, then, and }) => {
    authenticate(given);

    when('I request the list of registered plugins', async () => {
      response = await request(getApp().getHttpServer())
        .get('/plugins')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the plugins list should include the plugin with id "(.*)"$/, (id: string) => {
      const ids = (response.body as Array<{ id: string }>).map((p) => p.id);
      expect(ids).toContain(id);
    });

    and(/^the "(.*)" plugin entry should expose its name and version$/, (id: string) => {
      const entry = (response.body as Array<{ id: string; name: string; version: string }>).find(
        (p) => p.id === id,
      );
      expect(entry?.name).toBeTruthy();
      expect(entry?.version).toBeTruthy();
    });
  });

  test("A registered plugin's controller is mounted under its namespace", ({
    given,
    when,
    then,
  }) => {
    authenticate(given);

    when("I call the example plugin's own endpoint", async () => {
      response = await request(getApp().getHttpServer())
        .get('/plugins/example/ping')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test("A registered plugin's entities are aggregated into the data source", ({
    given,
    when,
    then,
    and,
  }) => {
    authenticate(given);

    when(/^I create a widget through the example plugin with name "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .post('/plugins/example/widgets')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the widget is persisted in the "(.*)" table$/, async (table: string) => {
      const dataSource = getApp().get(DataSource);
      const rows = await dataSource.query(`SELECT id, name FROM "${table}" WHERE id = $1`, [
        response.body.id,
      ]);
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe(response.body.name);
    });
  });

  test('Listing plugins requires authentication', ({ when, then }) => {
    when('I request the list of registered plugins without authentication', async () => {
      response = await request(getApp().getHttpServer()).get('/plugins');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- PLUGIN VALIDATION (fail-fast at registration) ---
defineFeature(validationFeature, (test) => {
  class DummyModule {}
  // Plain class named "Widgets" => default table name "widgets" (un-namespaced).
  class Widgets {}

  let plugins: MarketlumApiPlugin[];
  let configError: Error | null;

  const makePlugin = (overrides: Partial<MarketlumApiPlugin> & { id?: string }): MarketlumApiPlugin => ({
    manifest: {
      id: overrides.id ?? 'x',
      name: 'X',
      version: '0.0.1',
      marketlumCoreVersion: '*',
      ...(overrides.manifest ?? {}),
    },
    module: DummyModule as never,
    entities: overrides.entities,
  });

  const configure = (when: any) =>
    when(/^the core module is configured with (?:those plugins|that plugin)$/, () => {
      configError = null;
      try {
        validatePlugins(plugins);
      } catch (error) {
        configError = error as Error;
      }
    });

  test('Two plugins declaring the same id are rejected', ({ given, when, then }) => {
    given(/^two plugins that both declare the id "(.*)"$/, (id: string) => {
      plugins = [makePlugin({ id }), makePlugin({ id })];
    });
    configure(when);
    then(
      /^configuration fails with an error mentioning a duplicate plugin id "(.*)"$/,
      (id: string) => {
        expect(configError).toBeTruthy();
        const msg = configError!.message.toLowerCase();
        expect(msg).toContain('duplicate plugin id');
        expect(msg).toContain(id);
      },
    );
  });

  test('A plugin id that collides with a reserved core name is rejected', ({
    given,
    when,
    then,
  }) => {
    given(/^a plugin declaring the reserved id "(.*)"$/, (id: string) => {
      plugins = [makePlugin({ id })];
    });
    configure(when);
    then(
      /^configuration fails with an error mentioning a reserved plugin id "(.*)"$/,
      (id: string) => {
        expect(configError).toBeTruthy();
        const msg = configError!.message.toLowerCase();
        expect(msg).toContain('reserved plugin id');
        expect(msg).toContain(id);
      },
    );
  });

  test('An entity whose table is not namespaced is rejected', ({ given, when, then }) => {
    given(/^a plugin "(.*)" with an entity mapped to the table "(.*)"$/, (id: string) => {
      plugins = [makePlugin({ id, entities: [Widgets] })];
    });
    configure(when);
    then(
      /^configuration fails with an error mentioning the required table prefix "(.*)"$/,
      (prefix: string) => {
        expect(configError).toBeTruthy();
        expect(configError!.message).toContain(prefix);
      },
    );
  });

  test('A plugin requiring an incompatible core version is rejected', ({ given, when, then }) => {
    given(/^a plugin requiring core version "(.*)"$/, (range: string) => {
      plugins = [makePlugin({ id: 'compat', manifest: { marketlumCoreVersion: range } as never })];
    });
    configure(when);
    then(/^configuration fails with an error mentioning an incompatible core version$/, () => {
      expect(configError).toBeTruthy();
      expect(configError!.message.toLowerCase()).toContain('incompatible core version');
    });
  });
});

// --- PLUGIN SETTINGS ---
defineFeature(settingsFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
  });
  afterAll(async () => {
    await teardownApp();
  });

  const authenticate = (given: any) =>
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

  const statusThen = (then: any) =>
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

  test('Reading settings before any are stored returns the plugin defaults', ({
    given,
    when,
    then,
    and,
  }) => {
    authenticate(given);
    when(/^I get the settings for the plugin "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/plugins/${id}/settings`)
        .set('Cookie', [authCookie]);
    });
    statusThen(then);
    and("the returned settings should equal the example plugin's defaults", () => {
      expect(response.body.value).toEqual(EXAMPLE_DEFAULTS);
    });
  });

  test('Updating settings validates and persists them', ({ given, when, then, and }) => {
    authenticate(given);
    when(/^I update the settings for the plugin "(.*)" with a valid payload$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .put(`/plugins/${id}/settings`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send(VALID_SETTINGS);
    });
    statusThen(then);
    and(
      /^getting the settings for the plugin "(.*)" returns the updated values$/,
      async (id: string) => {
        const read = await request(getApp().getHttpServer())
          .get(`/plugins/${id}/settings`)
          .set('Cookie', [authCookie]);
        expect(read.body.value).toEqual(VALID_SETTINGS);
      },
    );
    and(/^the settings are stored under the key "(.*)"$/, async (key: string) => {
      const dataSource = getApp().get(DataSource);
      const rows = await dataSource.query(`SELECT value FROM system_settings WHERE key = $1`, [key]);
      expect(rows).toHaveLength(1);
    });
  });

  test('An invalid settings payload is rejected', ({ given, when, then }) => {
    authenticate(given);
    when(/^I update the settings for the plugin "(.*)" with an invalid payload$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .put(`/plugins/${id}/settings`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ label: 123, enabled: 'nope' });
    });
    statusThen(then);
  });

  test('Settings for an unknown plugin return 404', ({ given, when, then }) => {
    authenticate(given);
    when(/^I get the settings for the plugin "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/plugins/${id}/settings`)
        .set('Cookie', [authCookie]);
    });
    statusThen(then);
  });

  test('Unauthenticated users cannot read or change plugin settings', ({ when, then }) => {
    when(/^I get the settings for the plugin "(.*)" without authentication$/, async (id: string) => {
      response = await request(getApp().getHttpServer()).get(`/plugins/${id}/settings`);
    });
    statusThen(then);
  });
});

// --- PLUGIN DOMAIN EVENTS ---
defineFeature(eventsFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let widgetId: string;

  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
  });
  afterAll(async () => {
    await teardownApp();
  });

  const authenticate = (given: any) =>
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

  const createWidget = async (name: string) => {
    response = await request(getApp().getHttpServer())
      .post('/plugins/example/widgets')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send({ name });
    widgetId = response.body.id;
  };

  const statusThen = (then: any) =>
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

  test('Creating a plugin entity publishes a namespaced created event', ({
    given,
    when,
    then,
    and,
  }) => {
    authenticate(given);
    when(/^I create a widget through the example plugin with name "(.*)"$/, async (name: string) => {
      await createWidget(name);
    });
    statusThen(then);
    and(/^the event "(.*)" was published with the new entity's id$/, (eventName: string) => {
      expectEventWithId(eventName);
    });
  });

  test('Updating a plugin entity publishes a namespaced updated event', ({
    given,
    when,
    then,
    and,
  }) => {
    authenticate(given);
    given('a widget exists through the example plugin', async () => {
      await createWidget('Initial');
    });
    when("I update the recorded widget's name", async () => {
      response = await request(getApp().getHttpServer())
        .patch(`/plugins/example/widgets/${widgetId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Renamed' });
    });
    statusThen(then);
    and(/^the event "(.*)" was published with the entity's id$/, (eventName: string) => {
      expectEventWithId(eventName);
    });
  });

  test('Deleting a plugin entity publishes a namespaced deleted event', ({
    given,
    when,
    then,
    and,
  }) => {
    authenticate(given);
    given('a widget exists through the example plugin', async () => {
      await createWidget('Doomed');
    });
    when('I delete the recorded widget', async () => {
      response = await request(getApp().getHttpServer())
        .delete(`/plugins/example/widgets/${widgetId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });
    statusThen(then);
    and(/^the event "(.*)" was published with the entity's id$/, (eventName: string) => {
      expectEventWithId(eventName);
    });
  });
});
