import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import {
  bootstrapApp,
  cleanDatabase,
  teardownApp,
  getApp,
  createAuthenticatedUser,
} from '../setup';

const createFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agreements/create-agreement.feature'),
);
const getFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agreements/get-agreement.feature'),
);
const getTreeFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agreements/get-agreement-tree.feature'),
);
const updateFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agreements/update-agreement.feature'),
);
const moveFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agreements/move-agreement.feature'),
);
const deleteFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agreements/delete-agreement.feature'),
);
const searchFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/agreements/search-agreements.feature'),
);

const agreementIds = new Map<string, string>();
const agentIds = new Map<string, string>();
const fileIds = new Map<string, string>();

async function createAgent(
  authCookie: string,
  name: string,
): Promise<string> {
  const res = await request(getApp().getHttpServer())
    .post('/agents')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'organization' });
  agentIds.set(name, res.body.id);
  return res.body.id;
}

async function createAgreement(
  authCookie: string,
  title: string,
  partyIds: string[],
  parentId?: string,
  content?: string,
  link?: string,
  fileId?: string,
): Promise<request.Response> {
  const body: Record<string, unknown> = { title, partyIds };
  if (parentId) body.parentId = parentId;
  if (content) body.content = content;
  if (link) body.link = link;
  if (fileId) body.fileId = fileId;
  return request(getApp().getHttpServer())
    .post('/agreements')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
}

async function buildTree(
  authCookie: string,
  table: { title: string; parent: string }[],
): Promise<void> {
  agreementIds.clear();
  const partyIds = Array.from(agentIds.values());
  for (const row of table) {
    const parentId = row.parent ? agreementIds.get(row.parent) : undefined;
    const res = await createAgreement(authCookie, row.title, partyIds, parentId);
    agreementIds.set(row.title, res.body.id);
  }
}

async function uploadFile(authCookie: string, name: string): Promise<string> {
  const buffer = Buffer.from('test-file-content');
  const res = await request(getApp().getHttpServer())
    .post('/files/upload')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .attach('file', buffer, { filename: name, contentType: 'application/pdf' });
  fileIds.set(name, res.body.id);
  return res.body.id;
}

function getAllPartyIds(): string[] {
  return Array.from(agentIds.values());
}

// --- CREATE AGREEMENT ---
defineFeature(createFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    agreementIds.clear();
    agentIds.clear();
    fileIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Successfully create a root agreement with parties', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    when(
      'I create an agreement with:',
      async (table: { title: string; content: string }[]) => {
        const row = table[0];
        response = await createAgreement(
          authCookie,
          row.title,
          getAllPartyIds(),
          undefined,
          row.content || undefined,
        );
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an agreement with title "(.*)"$/, (title: string) => {
      expect(response.body.title).toBe(title);
    });

    and(/^the response should contain an agreement with content "(.*)"$/, (content: string) => {
      expect(response.body.content).toBe(content);
    });

    and(/^the response should contain (\d+) parties$/, (count: string) => {
      expect(response.body.parties).toHaveLength(parseInt(count));
    });
  });

  test('Successfully create a child agreement', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a root agreement exists with title "(.*)"$/, async (title: string) => {
      const res = await createAgreement(authCookie, title, getAllPartyIds());
      agreementIds.set(title, res.body.id);
    });

    when(
      /^I create a child agreement with parent "(.*)":/,
      async (parentTitle: string, table: { title: string }[]) => {
        const row = table[0];
        const parentId = agreementIds.get(parentTitle);
        response = await createAgreement(authCookie, row.title, getAllPartyIds(), parentId);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an agreement with title "(.*)"$/, (title: string) => {
      expect(response.body.title).toBe(title);
    });
  });

  test('Create agreement with file and link', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a file exists with name "(.*)"$/, async (name: string) => {
      await uploadFile(authCookie, name);
    });

    when(
      'I create an agreement with file and link:',
      async (table: { title: string; link: string }[]) => {
        const row = table[0];
        const fileId = fileIds.values().next().value;
        response = await createAgreement(
          authCookie,
          row.title,
          getAllPartyIds(),
          undefined,
          undefined,
          row.link,
          fileId,
        );
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an agreement with title "(.*)"$/, (title: string) => {
      expect(response.body.title).toBe(title);
    });

    and('the response should include a file', () => {
      expect(response.body.file).toBeDefined();
      expect(response.body.file).not.toBeNull();
    });

    and(/^the response should contain link "(.*)"$/, (link: string) => {
      expect(response.body.link).toBe(link);
    });
  });

  test('Creating an agreement with empty title fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    when('I create an agreement with empty title', async () => {
      response = await request(getApp().getHttpServer())
        .post('/agreements')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ title: '', partyIds: getAllPartyIds() });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Creating an agreement with fewer than 2 parties fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    when('I create an agreement with 1 party', async () => {
      const singlePartyId = agentIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .post('/agreements')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ title: 'Test Agreement', partyIds: [singlePartyId] });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Creating an agreement with non-existent parent fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    when('I create an agreement with non-existent parent', async () => {
      response = await request(getApp().getHttpServer())
        .post('/agreements')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({
          title: 'Test',
          partyIds: getAllPartyIds(),
          parentId: '00000000-0000-0000-0000-000000000000',
        });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I create an agreement without authentication', async () => {
      response = await request(getApp().getHttpServer())
        .post('/agreements')
        .set('X-CSRF-Protection', '1')
        .send({ title: 'Test', partyIds: ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'] });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- GET AGREEMENT ---
defineFeature(getFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    agreementIds.clear();
    agentIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Get an existing agreement by ID', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a root agreement exists with title "(.*)"$/, async (title: string) => {
      const res = await createAgreement(authCookie, title, getAllPartyIds());
      agreementIds.set(title, res.body.id);
    });

    when('I request the agreement by its ID', async () => {
      const id = agreementIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .get(`/agreements/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an agreement with title "(.*)"$/, (title: string) => {
      expect(response.body.title).toBe(title);
    });

    and(/^the response should contain (\d+) parties$/, (count: string) => {
      expect(response.body.parties).toHaveLength(parseInt(count));
    });
  });

  test('Get a non-existent agreement returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I request an agreement with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/agreements/${id}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I request an agreement with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer()).get(`/agreements/${id}`);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- GET AGREEMENT TREE ---
defineFeature(getTreeFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    agreementIds.clear();
    agentIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Get the full agreement tree', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(
      'the following agreement tree exists:',
      async (table: { title: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when('I request the full agreement tree', async () => {
      response = await request(getApp().getHttpServer())
        .get('/agreements/tree')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the tree should contain (\d+) root nodes$/, (count: string) => {
      expect(response.body).toHaveLength(parseInt(count));
    });

    and(
      /^the root "(.*)" should have (\d+) children$/,
      (rootTitle: string, count: string) => {
        const root = response.body.find((n: { title: string }) => n.title === rootTitle);
        expect(root).toBeDefined();
        expect(root.children).toHaveLength(parseInt(count));
      },
    );
  });

  test('Get root agreements only', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(
      'the following agreement tree exists:',
      async (table: { title: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when('I request the root agreements', async () => {
      response = await request(getApp().getHttpServer())
        .get('/agreements/roots')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) agreements$/, (count: string) => {
      expect(response.body).toHaveLength(parseInt(count));
    });
  });

  test('Get direct children of an agreement', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(
      'the following agreement tree exists:',
      async (table: { title: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(/^I request the children of "(.*)"$/, async (title: string) => {
      const id = agreementIds.get(title);
      response = await request(getApp().getHttpServer())
        .get(`/agreements/${id}/children`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) agreements$/, (count: string) => {
      expect(response.body).toHaveLength(parseInt(count));
    });
  });

  test('Get descendants tree of an agreement', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(
      'the following agreement tree exists:',
      async (table: { title: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(/^I request the descendants tree of "(.*)"$/, async (title: string) => {
      const id = agreementIds.get(title);
      response = await request(getApp().getHttpServer())
        .get(`/agreements/${id}/descendants`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the descendants tree should contain child "(.*)"$/, (childTitle: string) => {
      const hasChild = response.body.children?.some(
        (c: { title: string }) => c.title === childTitle,
      );
      expect(hasChild).toBe(true);
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I request the full agreement tree', async () => {
      response = await request(getApp().getHttpServer()).get('/agreements/tree');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- UPDATE AGREEMENT ---
defineFeature(updateFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    agreementIds.clear();
    agentIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test("Successfully update an agreement's title", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a root agreement exists with title "(.*)"$/, async (title: string) => {
      const res = await createAgreement(authCookie, title, getAllPartyIds());
      agreementIds.set(title, res.body.id);
    });

    when(/^I update the agreement's title to "(.*)"$/, async (title: string) => {
      const id = agreementIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/agreements/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ title });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain an agreement with title "(.*)"$/, (title: string) => {
      expect(response.body.title).toBe(title);
    });
  });

  test("Successfully update an agreement's parties", ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a root agreement exists with title "(.*)"$/, async (title: string) => {
      const partyA = agentIds.get('Party A')!;
      const partyB = agentIds.get('Party B')!;
      const res = await createAgreement(authCookie, title, [partyA, partyB]);
      agreementIds.set(title, res.body.id);
    });

    when(
      /^I update the agreement's parties to "(.*)" and "(.*)"$/,
      async (party1: string, party2: string) => {
        const id = agreementIds.values().next().value;
        const partyId1 = agentIds.get(party1)!;
        const partyId2 = agentIds.get(party2)!;
        response = await request(getApp().getHttpServer())
          .patch(`/agreements/${id}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ partyIds: [partyId1, partyId2] });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain (\d+) parties$/, (count: string) => {
      expect(response.body.parties).toHaveLength(parseInt(count));
    });
  });

  test('Updating with fewer than 2 parties fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a root agreement exists with title "(.*)"$/, async (title: string) => {
      const res = await createAgreement(authCookie, title, getAllPartyIds());
      agreementIds.set(title, res.body.id);
    });

    when("I update the agreement's parties to 1 party", async () => {
      const id = agreementIds.values().next().value;
      const singlePartyId = agentIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/agreements/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ partyIds: [singlePartyId] });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Update a non-existent agreement returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I update the agreement with ID "(.*)" with title "(.*)"$/,
      async (id: string, title: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/agreements/${id}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ title });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      /^I update the agreement with ID "(.*)" with title "(.*)"$/,
      async (id: string, title: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/agreements/${id}`)
          .set('X-CSRF-Protection', '1')
          .send({ title });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- MOVE AGREEMENT ---
defineFeature(moveFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    agreementIds.clear();
    agentIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Move an agreement to a different parent', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(
      'the following agreement tree exists:',
      async (table: { title: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(
      /^I move "(.*)" to parent "(.*)"$/,
      async (nodeTitle: string, parentTitle: string) => {
        const id = agreementIds.get(nodeTitle);
        const parentId = agreementIds.get(parentTitle);
        response = await request(getApp().getHttpServer())
          .patch(`/agreements/${id}/move`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ parentId });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(
      /^the children of "(.*)" should include "(.*)"$/,
      async (parentTitle: string, childTitle: string) => {
        const parentId = agreementIds.get(parentTitle);
        const childrenRes = await request(getApp().getHttpServer())
          .get(`/agreements/${parentId}/children`)
          .set('Cookie', [authCookie]);
        const titles = childrenRes.body.map((c: { title: string }) => c.title);
        expect(titles).toContain(childTitle);
      },
    );
  });

  test('Move an agreement to root', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(
      'the following agreement tree exists:',
      async (table: { title: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(/^I move "(.*)" to root$/, async (nodeTitle: string) => {
      const id = agreementIds.get(nodeTitle);
      response = await request(getApp().getHttpServer())
        .patch(`/agreements/${id}/move`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ parentId: null });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(
      /^the root agreements should include "(.*)"$/,
      async (nodeTitle: string) => {
        const rootsRes = await request(getApp().getHttpServer())
          .get('/agreements/roots')
          .set('Cookie', [authCookie]);
        const titles = rootsRes.body.map((r: { title: string }) => r.title);
        expect(titles).toContain(nodeTitle);
      },
    );
  });

  test('Move to a non-existent parent fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a root agreement exists with title "(.*)"$/, async (title: string) => {
      const res = await createAgreement(authCookie, title, getAllPartyIds());
      agreementIds.set(title, res.body.id);
    });

    when(/^I move "(.*)" to non-existent parent$/, async (nodeTitle: string) => {
      const id = agreementIds.get(nodeTitle);
      response = await request(getApp().getHttpServer())
        .patch(`/agreements/${id}/move`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ parentId: '00000000-0000-0000-0000-000000000000' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      /^I move agreement with ID "(.*)" to root$/,
      async (id: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/agreements/${id}/move`)
          .set('X-CSRF-Protection', '1')
          .send({ parentId: null });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DELETE AGREEMENT ---
defineFeature(deleteFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    agreementIds.clear();
    agentIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Successfully delete a leaf agreement', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^a root agreement exists with title "(.*)"$/, async (title: string) => {
      const res = await createAgreement(authCookie, title, getAllPartyIds());
      agreementIds.set(title, res.body.id);
    });

    when('I delete the agreement', async () => {
      const id = agreementIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .delete(`/agreements/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Delete an agreement with children cascades', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(
      'the following agreement tree exists:',
      async (table: { title: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(/^I delete the agreement "(.*)"$/, async (title: string) => {
      const id = agreementIds.get(title);
      response = await request(getApp().getHttpServer())
        .delete(`/agreements/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the agreement "(.*)" should not exist$/, async (title: string) => {
      const id = agreementIds.get(title);
      const res = await request(getApp().getHttpServer())
        .get(`/agreements/${id}`)
        .set('Cookie', [authCookie]);
      expect(res.status).toBe(404);
    });

    and(/^the agreement "(.*)" should not exist$/, async (title: string) => {
      const id = agreementIds.get(title);
      const res = await request(getApp().getHttpServer())
        .get(`/agreements/${id}`)
        .set('Cookie', [authCookie]);
      expect(res.status).toBe(404);
    });
  });

  test('Delete a non-existent agreement returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I delete the agreement with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/agreements/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I delete the agreement with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/agreements/${id}`)
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- SEARCH AGREEMENTS ---
defineFeature(searchFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    agreementIds.clear();
    agentIds.clear();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Search with default pagination', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(
      'the following agreement tree exists:',
      async (table: { title: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when('I request the list of agreements', async () => {
      response = await request(getApp().getHttpServer())
        .get('/agreements/search')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should contain a paginated list', () => {
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('totalPages');
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });
  });

  test('Search by title', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(
      'the following agreement tree exists:',
      async (table: { title: string; parent: string }[]) => {
        await buildTree(authCookie, table);
      },
    );

    when(/^I request the list of agreements with search "(.*)"$/, async (search: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/agreements/search?search=${encodeURIComponent(search)}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });

    and(
      /^all returned agreements should have "(.*)" in their title or content$/,
      (term: string) => {
        const lower = term.toLowerCase();
        for (const item of response.body.data) {
          const titleMatch = item.title?.toLowerCase().includes(lower);
          const contentMatch = item.content?.toLowerCase().includes(lower);
          expect(titleMatch || contentMatch).toBe(true);
        }
      },
    );
  });

  test('Filter agreements by partyId', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(/^an agent exists with name "(.*)"$/, async (name: string) => {
      await createAgent(authCookie, name);
    });

    and(
      /^an agreement exists with title "(.*)" and parties "(.*)"$/,
      async (title: string, partiesStr: string) => {
        const partyNames = partiesStr.split(',').map((s) => s.trim());
        const partyIds = partyNames.map((name) => agentIds.get(name)!);
        const res = await createAgreement(authCookie, title, partyIds);
        agreementIds.set(title, res.body.id);
      },
    );

    and(
      /^an agreement exists with title "(.*)" and parties "(.*)"$/,
      async (title: string, partiesStr: string) => {
        const partyNames = partiesStr.split(',').map((s) => s.trim());
        const partyIds = partyNames.map((name) => agentIds.get(name)!);
        const res = await createAgreement(authCookie, title, partyIds);
        agreementIds.set(title, res.body.id);
      },
    );

    and(
      /^an agreement exists with title "(.*)" and parties "(.*)"$/,
      async (title: string, partiesStr: string) => {
        const partyNames = partiesStr.split(',').map((s) => s.trim());
        const partyIds = partyNames.map((name) => agentIds.get(name)!);
        const res = await createAgreement(authCookie, title, partyIds);
        agreementIds.set(title, res.body.id);
      },
    );

    when(
      /^I request the list of agreements with partyId for "(.*)"$/,
      async (agentName: string) => {
        const partyId = agentIds.get(agentName);
        response = await request(getApp().getHttpServer())
          .get(`/agreements/search?partyId=${partyId}`)
          .set('Cookie', [authCookie]);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });

    and(
      /^all returned agreements should have party "(.*)"$/,
      (agentName: string) => {
        const partyId = agentIds.get(agentName);
        for (const item of response.body.data) {
          const hasParty = item.parties?.some(
            (p: { id: string }) => p.id === partyId,
          );
          expect(hasParty).toBe(true);
        }
      },
    );
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I request the list of agreements', async () => {
      response = await request(getApp().getHttpServer())
        .get('/agreements/search');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
