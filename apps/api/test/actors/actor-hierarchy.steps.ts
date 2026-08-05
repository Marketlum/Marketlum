import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { bootstrapApp, cleanDatabase, teardownApp, getApp, createAuthenticatedUser } from '../setup';
import { expectEventWithId } from '../events/event-steps';

const feature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/actors/actor-hierarchy.feature'),
);

type StepFn = (regex: RegExp | string, fn: (...args: never[]) => unknown) => void;

defineFeature(feature, (test) => {
  let response: request.Response;
  let authCookie: string;
  const actorIds = new Map<string, string>();

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    actorIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  function server() {
    return getApp().getHttpServer();
  }

  async function createActor(
    name: string,
    type: string,
    parentId?: string | null,
  ): Promise<request.Response> {
    const body: Record<string, unknown> = { name, type };
    if (parentId !== undefined) body.parentId = parentId;
    const res = await request(server())
      .post('/actors')
      .set('Cookie', [authCookie])
      .set('X-CSRF-Protection', '1')
      .send(body);
    if (res.status === 201) actorIds.set(name, res.body.id);
    return res;
  }

  function registerBackground(given: StepFn) {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });
  }

  function registerRootActorExists(step: StepFn) {
    step(
      /^a root actor exists with name "(.*)" and type "(.*)"$/,
      async (name: string, type: string) => {
        const res = await createActor(name, type);
        expect(res.status).toBe(201);
      },
    );
  }

  function registerChildActorExists(step: StepFn) {
    step(
      /^an actor exists with name "(.*)" and type "(.*)" under parent "(.*)"$/,
      async (name: string, type: string, parentName: string) => {
        const res = await createActor(name, type, actorIds.get(parentName));
        expect(res.status).toBe(201);
      },
    );
  }

  function registerStatus(then: StepFn) {
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  }

  function registerParentAndLevel(step: StepFn) {
    step(
      /^the actor response has parent "(.*)" and level (\d+)$/,
      (parentName: string, level: string) => {
        expect(response.body.parent).not.toBeNull();
        expect(response.body.parent.name).toBe(parentName);
        expect(response.body.level).toBe(parseInt(level));
      },
    );
  }

  function registerMoveUnder(when: StepFn) {
    when(/^I move the actor "(.*)" under "(.*)"$/, async (name: string, parentName: string) => {
      response = await request(server())
        .patch(`/actors/${actorIds.get(name)}/move`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ parentId: actorIds.get(parentName) });
    });
  }

  function registerMoveToRoot(step: StepFn) {
    step(/^I move the actor "(.*)" to root$/, async (name: string) => {
      response = await request(server())
        .patch(`/actors/${actorIds.get(name)}/move`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ parentId: null });
    });
  }

  function registerListContains(step: StepFn) {
    step(/^the actor list contains exactly "(.*)"$/, (names: string) => {
      const expected = names.split(',').map((n) => n.trim()).sort();
      const actual = response.body.map((a: { name: string }) => a.name).sort();
      expect(actual).toEqual(expected);
    });
  }

  test('Create an actor under a parent', ({ given, when, then, and }) => {
    registerBackground(given);
    registerRootActorExists(given);
    when(
      /^I create an actor named "(.*)" of type "(.*)" under parent "(.*)"$/,
      async (name: string, type: string, parentName: string) => {
        response = await createActor(name, type, actorIds.get(parentName));
      },
    );
    registerStatus(then);
    registerParentAndLevel(and);
  });

  test('Create an actor under an unknown parent fails', ({ given, when, then }) => {
    registerBackground(given);
    when(
      /^I create an actor named "(.*)" of type "(.*)" under an unknown parent$/,
      async (name: string, type: string) => {
        response = await createActor(name, type, randomUUID());
      },
    );
    registerStatus(then);
  });

  test('Get direct children of an actor', ({ given, when, then, and }) => {
    registerBackground(given);
    registerRootActorExists(given);
    registerChildActorExists(and);
    registerChildActorExists(and);
    when(/^I request the children of the actor "(.*)"$/, async (name: string) => {
      response = await request(server())
        .get(`/actors/${actorIds.get(name)}/children`)
        .set('Cookie', [authCookie]);
    });
    registerStatus(then);
    registerListContains(and);
  });

  test('Get the full actor tree', ({ given, when, then, and }) => {
    registerBackground(given);
    registerRootActorExists(given);
    registerRootActorExists(and);
    registerChildActorExists(and);
    when(/^I request the actor tree$/, async () => {
      response = await request(server()).get('/actors/tree').set('Cookie', [authCookie]);
    });
    registerStatus(then);
    and(
      /^the actor tree has a root "(.*)" with child "(.*)"$/,
      (rootName: string, childName: string) => {
        const root = response.body.find((n: { name: string }) => n.name === rootName);
        expect(root).toBeDefined();
        expect(root.children.map((c: { name: string }) => c.name)).toContain(childName);
      },
    );
    and(/^the actor tree has a root "(.*)" with no children$/, (rootName: string) => {
      const root = response.body.find((n: { name: string }) => n.name === rootName);
      expect(root).toBeDefined();
      expect(root.children).toHaveLength(0);
    });
  });

  test('Get descendants of an actor', ({ given, when, then, and }) => {
    registerBackground(given);
    registerRootActorExists(given);
    registerChildActorExists(and);
    registerChildActorExists(and);
    when(/^I request the descendants of the actor "(.*)"$/, async (name: string) => {
      response = await request(server())
        .get(`/actors/${actorIds.get(name)}/descendants`)
        .set('Cookie', [authCookie]);
    });
    registerStatus(then);
    registerListContains(and);
  });

  test('Move an actor to a different parent', ({ given, when, then, and }) => {
    registerBackground(given);
    registerRootActorExists(given);
    registerRootActorExists(and);
    registerChildActorExists(and);
    registerMoveUnder(when);
    registerStatus(then);
    registerParentAndLevel(and);
    and(
      /^the descendants of "(.*)" contain exactly "(.*)"$/,
      async (name: string, expected: string) => {
        const res = await request(server())
          .get(`/actors/${actorIds.get(name)}/descendants`)
          .set('Cookie', [authCookie]);
        expect(res.status).toBe(200);
        const actual = res.body.map((a: { name: string }) => a.name).sort();
        expect(actual).toEqual(expected.split(',').map((n) => n.trim()).sort());
      },
    );
    and(/^the event "(.*)" was published with the entity's id$/, (eventName: string) => {
      expectEventWithId(eventName);
    });
  });

  test('Move an actor to root', ({ given, when, then, and }) => {
    registerBackground(given);
    registerRootActorExists(given);
    registerChildActorExists(and);
    registerMoveToRoot(when);
    registerStatus(then);
    and(/^the actor response has no parent and level 0$/, () => {
      expect(response.body.parent).toBeNull();
      expect(response.body.parentId).toBeNull();
      expect(response.body.level).toBe(0);
    });
  });

  test('Move to a non-existent parent fails', ({ given, when, then }) => {
    registerBackground(given);
    registerRootActorExists(given);
    when(/^I move the actor "(.*)" under an unknown parent$/, async (name: string) => {
      response = await request(server())
        .patch(`/actors/${actorIds.get(name)}/move`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ parentId: randomUUID() });
    });
    registerStatus(then);
  });

  test('Move an actor into its own descendant fails', ({ given, when, then, and }) => {
    registerBackground(given);
    registerRootActorExists(given);
    registerChildActorExists(and);
    registerChildActorExists(and);
    registerMoveUnder(when);
    registerStatus(then);
  });

  test('Move an actor into itself fails', ({ given, when, then }) => {
    registerBackground(given);
    registerRootActorExists(given);
    registerMoveUnder(when);
    registerStatus(then);
  });

  test('Deleting an actor with sub-actors is rejected', ({ given, when, then, and }) => {
    registerBackground(given);
    registerRootActorExists(given);
    registerChildActorExists(and);
    when(/^I delete the actor "(.*)"$/, async (name: string) => {
      response = await request(server())
        .delete(`/actors/${actorIds.get(name)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });
    registerStatus(then);
    registerMoveToRoot(when);
    and(/^I delete the actor "(.*)"$/, async (name: string) => {
      response = await request(server())
        .delete(`/actors/${actorIds.get(name)}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });
    registerStatus(then);
  });
});
