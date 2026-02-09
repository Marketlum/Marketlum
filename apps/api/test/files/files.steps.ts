import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import * as fs from 'fs';
import {
  bootstrapApp,
  cleanDatabase,
  teardownApp,
  getApp,
  createAuthenticatedUser,
} from '../setup';

const createFolderFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/files/create-folder.feature'),
);
const getFolderTreeFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/files/get-folder-tree.feature'),
);
const updateFolderFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/files/update-folder.feature'),
);
const moveFolderFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/files/move-folder.feature'),
);
const deleteFolderFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/files/delete-folder.feature'),
);
const uploadFileFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/files/upload-file.feature'),
);
const listFilesFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/files/list-files.feature'),
);
const downloadFileFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/files/download-file.feature'),
);
const updateFileFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/files/update-file.feature'),
);
const deleteFileFeature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/files/delete-file.feature'),
);

// Track folder names → IDs
const folderIds = new Map<string, string>();
// Track file names → response bodies
const fileIds = new Map<string, { id: string; storedName: string }>();

// Uploads dir used by tests
const uploadsDir = path.resolve(process.cwd(), 'uploads');

function cleanUploads() {
  if (!fs.existsSync(uploadsDir)) return;
  const entries = fs.readdirSync(uploadsDir);
  for (const entry of entries) {
    if (entry === '.gitkeep') continue;
    fs.unlinkSync(path.join(uploadsDir, entry));
  }
}

async function createFolder(
  authCookie: string,
  name: string,
  parentId?: string,
): Promise<request.Response> {
  const body: Record<string, unknown> = { name };
  if (parentId) body.parentId = parentId;
  return request(getApp().getHttpServer())
    .post('/folders')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
}

async function buildFolderTree(
  authCookie: string,
  table: { name: string; parent: string }[],
): Promise<void> {
  folderIds.clear();
  for (const row of table) {
    const parentId = row.parent ? folderIds.get(row.parent) : undefined;
    const res = await createFolder(authCookie, row.name, parentId);
    folderIds.set(row.name, res.body.id);
  }
}

async function uploadFile(
  authCookie: string,
  filename: string,
  contentType: string,
  folderId?: string,
): Promise<request.Response> {
  const req = request(getApp().getHttpServer())
    .post('/files/upload')
    .set('Cookie', [authCookie])
    .set('X-CSRF-Protection', '1')
    .attach('file', Buffer.from('test content'), { filename, contentType });

  if (folderId) {
    req.field('folderId', folderId);
  }

  return req;
}

// --- CREATE FOLDER ---
defineFeature(createFolderFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    folderIds.clear();
    fileIds.clear();
    cleanUploads();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Successfully create a root folder', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I create a folder with name "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .post('/folders')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a folder with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Successfully create a child folder', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root folder exists with name "(.*)"$/, async (name: string) => {
      const res = await createFolder(authCookie, name);
      folderIds.set(name, res.body.id);
    });

    when(
      /^I create a folder with name "(.*)" and parent "(.*)"$/,
      async (name: string, parentName: string) => {
        const parentId = folderIds.get(parentName);
        response = await request(getApp().getHttpServer())
          .post('/folders')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name, parentId });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a folder with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Creating a folder with empty name fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I create a folder with name "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .post('/folders')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Creating a folder with non-existent parent fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I create a folder with non-existent parent', async () => {
      response = await request(getApp().getHttpServer())
        .post('/folders')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name: 'Test', parentId: '00000000-0000-0000-0000-000000000000' });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I create a folder with name "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .post('/folders')
        .set('X-CSRF-Protection', '1')
        .send({ name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- GET FOLDER TREE ---
defineFeature(getFolderTreeFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    folderIds.clear();
    fileIds.clear();
    cleanUploads();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Get the full folder tree', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following folder tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildFolderTree(authCookie, table);
      },
    );

    when('I request the full folder tree', async () => {
      response = await request(getApp().getHttpServer())
        .get('/folders/tree')
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
      (rootName: string, count: string) => {
        const root = response.body.find((n: { name: string }) => n.name === rootName);
        expect(root).toBeDefined();
        expect(root.children).toHaveLength(parseInt(count));
      },
    );
  });

  test('Get an empty folder tree', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I request the full folder tree', async () => {
      response = await request(getApp().getHttpServer())
        .get('/folders/tree')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the tree should contain (\d+) root nodes$/, (count: string) => {
      expect(response.body).toHaveLength(parseInt(count));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I request the full folder tree', async () => {
      response = await request(getApp().getHttpServer()).get('/folders/tree');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- UPDATE FOLDER ---
defineFeature(updateFolderFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    folderIds.clear();
    fileIds.clear();
    cleanUploads();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Successfully rename a folder', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root folder exists with name "(.*)"$/, async (name: string) => {
      const res = await createFolder(authCookie, name);
      folderIds.set(name, res.body.id);
    });

    when(/^I update the folder's name to "(.*)"$/, async (name: string) => {
      const id = folderIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .patch(`/folders/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a folder with name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Update a non-existent folder returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I update the folder with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/folders/${id}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      /^I update the folder with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/folders/${id}`)
          .set('X-CSRF-Protection', '1')
          .send({ name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- MOVE FOLDER ---
defineFeature(moveFolderFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    folderIds.clear();
    fileIds.clear();
    cleanUploads();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Move a folder to a different parent', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following folder tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildFolderTree(authCookie, table);
      },
    );

    when(
      /^I move "(.*)" to parent "(.*)"$/,
      async (nodeName: string, parentName: string) => {
        const id = folderIds.get(nodeName);
        const parentId = folderIds.get(parentName);
        response = await request(getApp().getHttpServer())
          .patch(`/folders/${id}/move`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ parentId });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(
      /^the folder tree should show "(.*)" under "(.*)"$/,
      async (childName: string, parentName: string) => {
        const treeRes = await request(getApp().getHttpServer())
          .get('/folders/tree')
          .set('Cookie', [authCookie]);
        const findNode = (nodes: any[], name: string): any => {
          for (const node of nodes) {
            if (node.name === name) return node;
            if (node.children) {
              const found = findNode(node.children, name);
              if (found) return found;
            }
          }
          return null;
        };
        const parent = findNode(treeRes.body, parentName);
        expect(parent).toBeDefined();
        const childNames = parent.children.map((c: { name: string }) => c.name);
        expect(childNames).toContain(childName);
      },
    );
  });

  test('Move a folder to root', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following folder tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildFolderTree(authCookie, table);
      },
    );

    when(/^I move folder "(.*)" to root$/, async (nodeName: string) => {
      const id = folderIds.get(nodeName);
      response = await request(getApp().getHttpServer())
        .patch(`/folders/${id}/move`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ parentId: null });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(
      /^the root folders should include "(.*)"$/,
      async (nodeName: string) => {
        const treeRes = await request(getApp().getHttpServer())
          .get('/folders/tree')
          .set('Cookie', [authCookie]);
        const names = treeRes.body.map((r: { name: string }) => r.name);
        expect(names).toContain(nodeName);
      },
    );
  });

  test('Move to a non-existent parent fails', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root folder exists with name "(.*)"$/, async (name: string) => {
      const res = await createFolder(authCookie, name);
      folderIds.set(name, res.body.id);
    });

    when(/^I move folder "(.*)" to non-existent parent$/, async (nodeName: string) => {
      const id = folderIds.get(nodeName);
      response = await request(getApp().getHttpServer())
        .patch(`/folders/${id}/move`)
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
      /^I move folder with ID "(.*)" to root$/,
      async (id: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/folders/${id}/move`)
          .set('X-CSRF-Protection', '1')
          .send({ parentId: null });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DELETE FOLDER ---
defineFeature(deleteFolderFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let uploadedStoredName: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    folderIds.clear();
    fileIds.clear();
    cleanUploads();
    uploadedStoredName = '';
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Successfully delete an empty folder', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root folder exists with name "(.*)"$/, async (name: string) => {
      const res = await createFolder(authCookie, name);
      folderIds.set(name, res.body.id);
    });

    when('I delete the folder', async () => {
      const id = folderIds.values().next().value;
      response = await request(getApp().getHttpServer())
        .delete(`/folders/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Delete a folder with children cascades', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following folder tree exists:',
      async (table: { name: string; parent: string }[]) => {
        await buildFolderTree(authCookie, table);
      },
    );

    when(/^I delete the folder "(.*)"$/, async (name: string) => {
      const id = folderIds.get(name);
      response = await request(getApp().getHttpServer())
        .delete(`/folders/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the folder "(.*)" should not exist$/, async (name: string) => {
      const id = folderIds.get(name);
      const res = await request(getApp().getHttpServer())
        .get(`/folders/${id}`)
        .set('Cookie', [authCookie]);
      expect(res.status).toBe(404);
    });

    and(/^the folder "(.*)" should not exist$/, async (name: string) => {
      const id = folderIds.get(name);
      const res = await request(getApp().getHttpServer())
        .get(`/folders/${id}`)
        .set('Cookie', [authCookie]);
      expect(res.status).toBe(404);
    });
  });

  test('Delete a folder cascades its files', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root folder exists with name "(.*)"$/, async (name: string) => {
      const res = await createFolder(authCookie, name);
      folderIds.set(name, res.body.id);
    });

    and(
      /^a file "(.*)" is uploaded to folder "(.*)"$/,
      async (filename: string, folderName: string) => {
        const folderId = folderIds.get(folderName);
        const res = await uploadFile(authCookie, filename, 'application/pdf', folderId);
        uploadedStoredName = res.body.storedName;
        fileIds.set(filename, { id: res.body.id, storedName: res.body.storedName });
      },
    );

    when(/^I delete the folder "(.*)"$/, async (name: string) => {
      const id = folderIds.get(name);
      response = await request(getApp().getHttpServer())
        .delete(`/folders/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the uploaded file should be removed from disk', () => {
      const filePath = path.join(uploadsDir, uploadedStoredName);
      expect(fs.existsSync(filePath)).toBe(false);
    });
  });

  test('Delete a non-existent folder returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I delete the folder with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/folders/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I delete the folder with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/folders/${id}`)
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- UPLOAD FILE ---
defineFeature(uploadFileFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    folderIds.clear();
    fileIds.clear();
    cleanUploads();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Upload a file to root', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I upload a file "(.*)" with content type "(.*)"$/,
      async (filename: string, contentType: string) => {
        response = await uploadFile(authCookie, filename, contentType);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a file with originalName "(.*)"$/, (name: string) => {
      expect(response.body.originalName).toBe(name);
    });

    and(/^the response should contain a file with mimeType "(.*)"$/, (mime: string) => {
      expect(response.body.mimeType).toBe(mime);
    });

    and('the file should be stored on disk', () => {
      const filePath = path.join(uploadsDir, response.body.storedName);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  test('Upload a file to a folder', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root folder exists with name "(.*)"$/, async (name: string) => {
      const res = await createFolder(authCookie, name);
      folderIds.set(name, res.body.id);
    });

    when(
      /^I upload a file "(.*)" with content type "(.*)" to folder "(.*)"$/,
      async (filename: string, contentType: string, folderName: string) => {
        const folderId = folderIds.get(folderName);
        response = await uploadFile(authCookie, filename, contentType, folderId);
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a file with originalName "(.*)"$/, (name: string) => {
      expect(response.body.originalName).toBe(name);
    });

    and('the response should have a folderId', () => {
      expect(response.body.folderId).toBeTruthy();
    });
  });

  test('Upload to a non-existent folder fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I upload a file "(.*)" with content type "(.*)" to non-existent folder$/,
      async (filename: string, contentType: string) => {
        response = await request(getApp().getHttpServer())
          .post('/files/upload')
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .attach('file', Buffer.from('test content'), { filename, contentType })
          .field('folderId', '00000000-0000-0000-0000-000000000000');
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Upload without a file attached fails', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when('I upload without attaching a file', async () => {
      response = await request(getApp().getHttpServer())
        .post('/files/upload')
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      /^I upload a file "(.*)" with content type "(.*)"$/,
      async (filename: string, contentType: string) => {
        response = await request(getApp().getHttpServer())
          .post('/files/upload')
          .set('X-CSRF-Protection', '1')
          .attach('file', Buffer.from('test content'), { filename, contentType });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- LIST FILES ---
defineFeature(listFilesFeature, (test) => {
  let response: request.Response;
  let authCookie: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    folderIds.clear();
    fileIds.clear();
    cleanUploads();
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('List files with default pagination', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(
      'the following files exist:',
      async (table: { name: string; contentType: string }[]) => {
        for (const row of table) {
          const res = await uploadFile(authCookie, row.name, row.contentType);
          fileIds.set(row.name, { id: res.body.id, storedName: res.body.storedName });
        }
      },
    );

    when('I request the list of files', async () => {
      response = await request(getApp().getHttpServer())
        .get('/files')
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

  test('Filter files by folderId', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root folder exists with name "(.*)"$/, async (name: string) => {
      const res = await createFolder(authCookie, name);
      folderIds.set(name, res.body.id);
    });

    and(
      /^a file "(.*)" is uploaded to folder "(.*)"$/,
      async (filename: string, folderName: string) => {
        const folderId = folderIds.get(folderName);
        const res = await uploadFile(authCookie, filename, 'application/pdf', folderId);
        fileIds.set(filename, { id: res.body.id, storedName: res.body.storedName });
      },
    );

    and(
      /^a file "(.*)" is uploaded to root$/,
      async (filename: string) => {
        const res = await uploadFile(authCookie, filename, 'image/png');
        fileIds.set(filename, { id: res.body.id, storedName: res.body.storedName });
      },
    );

    when(/^I request the list of files in folder "(.*)"$/, async (folderName: string) => {
      const folderId = folderIds.get(folderName);
      response = await request(getApp().getHttpServer())
        .get(`/files?folderId=${folderId}`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });
  });

  test('Filter root-only files', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root folder exists with name "(.*)"$/, async (name: string) => {
      const res = await createFolder(authCookie, name);
      folderIds.set(name, res.body.id);
    });

    and(
      /^a file "(.*)" is uploaded to folder "(.*)"$/,
      async (filename: string, folderName: string) => {
        const folderId = folderIds.get(folderName);
        const res = await uploadFile(authCookie, filename, 'application/pdf', folderId);
        fileIds.set(filename, { id: res.body.id, storedName: res.body.storedName });
      },
    );

    and(
      /^a file "(.*)" is uploaded to root$/,
      async (filename: string) => {
        const res = await uploadFile(authCookie, filename, 'image/png');
        fileIds.set(filename, { id: res.body.id, storedName: res.body.storedName });
      },
    );

    when('I request the list of root files', async () => {
      response = await request(getApp().getHttpServer())
        .get('/files?root=true')
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(response.body.meta.total).toBe(parseInt(count));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when('I request the list of files', async () => {
      response = await request(getApp().getHttpServer()).get('/files');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DOWNLOAD FILE ---
defineFeature(downloadFileFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let uploadedFileId: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    folderIds.clear();
    fileIds.clear();
    cleanUploads();
    uploadedFileId = '';
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Successfully download a file', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file "(.*)" has been uploaded$/, async (filename: string) => {
      const res = await uploadFile(authCookie, filename, 'image/png');
      uploadedFileId = res.body.id;
      fileIds.set(filename, { id: res.body.id, storedName: res.body.storedName });
    });

    when('I download the file', async () => {
      response = await request(getApp().getHttpServer())
        .get(`/files/${uploadedFileId}/download`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should have content-disposition header', () => {
      expect(response.headers['content-disposition']).toBeDefined();
    });

    and('the response body should contain the file content', () => {
      expect(response.body).toBeDefined();
    });
  });

  test('Download a non-existent file returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I download a file with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/files/${id}/download`)
        .set('Cookie', [authCookie]);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I download a file with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .get(`/files/${id}/download`);
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- UPDATE FILE ---
defineFeature(updateFileFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let uploadedFileId: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    folderIds.clear();
    fileIds.clear();
    cleanUploads();
    uploadedFileId = '';
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Rename a file', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file "(.*)" has been uploaded$/, async (filename: string) => {
      const res = await uploadFile(authCookie, filename, 'image/png');
      uploadedFileId = res.body.id;
    });

    when(/^I update the file's name to "(.*)"$/, async (name: string) => {
      response = await request(getApp().getHttpServer())
        .patch(`/files/${uploadedFileId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ originalName: name });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and(/^the response should contain a file with originalName "(.*)"$/, (name: string) => {
      expect(response.body.originalName).toBe(name);
    });
  });

  test('Move a file to a folder', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root folder exists with name "(.*)"$/, async (name: string) => {
      const res = await createFolder(authCookie, name);
      folderIds.set(name, res.body.id);
    });

    and(/^a file "(.*)" has been uploaded$/, async (filename: string) => {
      const res = await uploadFile(authCookie, filename, 'image/png');
      uploadedFileId = res.body.id;
    });

    when(/^I move the file to folder "(.*)"$/, async (folderName: string) => {
      const folderId = folderIds.get(folderName);
      response = await request(getApp().getHttpServer())
        .patch(`/files/${uploadedFileId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ folderId });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response should have a folderId', () => {
      expect(response.body.folderId).toBeTruthy();
    });
  });

  test('Move a file to root', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a root folder exists with name "(.*)"$/, async (name: string) => {
      const res = await createFolder(authCookie, name);
      folderIds.set(name, res.body.id);
    });

    and(/^a file "(.*)" has been uploaded to folder "(.*)"$/, async (filename: string, folderName: string) => {
      const folderId = folderIds.get(folderName);
      const res = await uploadFile(authCookie, filename, 'image/png', folderId);
      uploadedFileId = res.body.id;
    });

    when('I move the file to root', async () => {
      response = await request(getApp().getHttpServer())
        .patch(`/files/${uploadedFileId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ folderId: null });
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the response folderId should be null', () => {
      expect(response.body.folderId).toBeNull();
    });
  });

  test('Update a non-existent file returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(
      /^I update the file with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/files/${id}`)
          .set('Cookie', [authCookie])
          .set('X-CSRF-Protection', '1')
          .send({ originalName: name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(
      /^I update the file with ID "(.*)" with name "(.*)"$/,
      async (id: string, name: string) => {
        response = await request(getApp().getHttpServer())
          .patch(`/files/${id}`)
          .set('X-CSRF-Protection', '1')
          .send({ originalName: name });
      },
    );

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});

// --- DELETE FILE ---
defineFeature(deleteFileFeature, (test) => {
  let response: request.Response;
  let authCookie: string;
  let uploadedFileId: string;
  let uploadedStoredName: string;

  beforeAll(async () => {
    await bootstrapApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    folderIds.clear();
    fileIds.clear();
    cleanUploads();
    uploadedFileId = '';
    uploadedStoredName = '';
  });

  afterAll(async () => {
    await teardownApp();
  });

  test('Delete a file and clean up from disk', ({ given, when, then, and }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    and(/^a file "(.*)" has been uploaded$/, async (filename: string) => {
      const res = await uploadFile(authCookie, filename, 'image/png');
      uploadedFileId = res.body.id;
      uploadedStoredName = res.body.storedName;
    });

    when('I delete the file', async () => {
      response = await request(getApp().getHttpServer())
        .delete(`/files/${uploadedFileId}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });

    and('the uploaded file should be removed from disk', () => {
      const filePath = path.join(uploadsDir, uploadedStoredName);
      expect(fs.existsSync(filePath)).toBe(false);
    });
  });

  test('Delete a non-existent file returns 404', ({ given, when, then }) => {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      authCookie = await createAuthenticatedUser(email, 'password123');
    });

    when(/^I delete the file with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/files/${id}`)
        .set('Cookie', [authCookie])
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });

  test('Unauthenticated request is rejected', ({ when, then }) => {
    when(/^I delete the file with ID "(.*)"$/, async (id: string) => {
      response = await request(getApp().getHttpServer())
        .delete(`/files/${id}`)
        .set('X-CSRF-Protection', '1');
    });

    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
