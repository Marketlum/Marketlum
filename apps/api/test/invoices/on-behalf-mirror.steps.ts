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

const feature = loadFeature(
  path.resolve(__dirname, '../../../../packages/bdd/features/invoices/on-behalf-mirror.feature'),
);

interface Ctx {
  authCookie: string;
  valueIds: Map<string, string>;
  actorIds: Map<string, string>;
  sourceId: string;
  sourceBody: Record<string, any>;
  mirrorBody: Record<string, any> | null;
  response: request.Response;
}

function makeCtx(): Ctx {
  return {
    authCookie: '',
    valueIds: new Map(),
    actorIds: new Map(),
    sourceId: '',
    sourceBody: {},
    mirrorBody: null,
    response: {} as request.Response,
  };
}

function server() {
  return getApp().getHttpServer();
}

async function createValue(ctx: Ctx, name: string): Promise<void> {
  if (ctx.valueIds.has(name)) return;
  const res = await request(server())
    .post('/values')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ name, type: 'currency', purpose: `Test currency ${name}` });
  ctx.valueIds.set(name, res.body.id);
}

async function createActor(
  ctx: Ctx,
  name: string,
  type: string,
  currencyName: string,
  parentName?: string,
): Promise<void> {
  const body: Record<string, unknown> = {
    name,
    type,
    functionalCurrencyId: ctx.valueIds.get(currencyName),
  };
  if (parentName) body.parentId = ctx.actorIds.get(parentName);
  const res = await request(server())
    .post('/actors')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
  ctx.actorIds.set(name, res.body.id);
}

async function createRate(
  ctx: Ctx,
  from: string,
  to: string,
  rate: string,
  effectiveAt: string,
): Promise<void> {
  await request(server())
    .post('/exchange-rates')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({
      fromValueId: ctx.valueIds.get(from),
      toValueId: ctx.valueIds.get(to),
      rate,
      effectiveAt: `${effectiveAt}T00:00:00.000Z`,
    });
}

async function createInvoice(
  ctx: Ctx,
  args: {
    number: string;
    market: string;
    from: string;
    to: string;
    onBehalfOf?: string;
    itemTotal?: string;
  },
): Promise<request.Response> {
  const body: Record<string, unknown> = {
    number: args.number,
    fromActorId: ctx.actorIds.get(args.from),
    toActorId: ctx.actorIds.get(args.to),
    currencyId: ctx.valueIds.get('USD'),
    issuedAt: '2026-01-15T00:00:00.000Z',
    dueAt: '2026-02-15T00:00:00.000Z',
    market: args.market,
  };
  if (args.onBehalfOf) body.onBehalfOfActorId = ctx.actorIds.get(args.onBehalfOf);
  if (args.itemTotal) {
    body.items = [{ quantity: '1.00', unitPrice: args.itemTotal, total: args.itemTotal }];
  }
  const res = await request(server())
    .post('/invoices')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send(body);
  if (res.status === 201) {
    ctx.sourceId = res.body.id;
    ctx.sourceBody = res.body;
  }
  return res;
}

/** Re-fetches the source (mirror ids churn on regeneration) and then its mirror. */
async function fetchMirror(ctx: Ctx): Promise<Record<string, any> | null> {
  const source = await request(server())
    .get(`/invoices/${ctx.sourceId}`)
    .set('Cookie', [ctx.authCookie]);
  ctx.sourceBody = source.body;
  if (!source.body.mirrorInvoice) {
    ctx.mirrorBody = null;
    return null;
  }
  const mirror = await request(server())
    .get(`/invoices/${source.body.mirrorInvoice.id}`)
    .set('Cookie', [ctx.authCookie]);
  ctx.mirrorBody = mirror.body;
  return mirror.body;
}

type StepFn = (regex: RegExp | string, fn: (...args: never[]) => unknown) => void;

function registerBackground(ctx: Ctx, given: StepFn, and: StepFn) {
  given(/^I am authenticated as "(.*)"$/, async (email: string) => {
    ctx.authCookie = await createAuthenticatedUser(email, 'password123');
  });
  and(/^a currency value exists named "(.*)"$/, async (name: string) => {
    await createValue(ctx, name);
  });
  and(
    /^an actor exists named "(.*)" of type "(.*)" with functional currency "(.*)"$/,
    async (name: string, type: string, currency: string) => {
      await createActor(ctx, name, type, currency);
    },
  );
  and(
    /^an actor exists named "(.*)" of type "(.*)" with functional currency "(.*)" under parent "(.*)"$/,
    async (name: string, type: string, currency: string, parent: string) => {
      await createActor(ctx, name, type, currency, parent);
    },
  );
  and(
    /^an actor exists named "(.*)" of type "(.*)" with functional currency "(.*)"$/,
    async (name: string, type: string, currency: string) => {
      await createActor(ctx, name, type, currency);
    },
  );
}

function registerStatus(ctx: Ctx, then: StepFn) {
  then(/^the response status should be (\d+)$/, (status: string) => {
    expect(ctx.response.status).toBe(parseInt(status));
  });
}

function registerCreateOnBehalfWithItem(ctx: Ctx, when: StepFn) {
  when(
    /^I create an external invoice numbered "(.*)" from "(.*)" to "(.*)" on behalf of "(.*)" with an item totalling "(.*)"$/,
    async (number: string, from: string, to: string, onBehalfOf: string, total: string) => {
      ctx.response = await createInvoice(ctx, {
        number,
        market: 'external',
        from,
        to,
        onBehalfOf,
        itemTotal: total,
      });
    },
  );
}

function registerExistingOnBehalf(ctx: Ctx, given: StepFn) {
  given(
    /^an external invoice exists numbered "(.*)" from "(.*)" to "(.*)" on behalf of "(.*)" with an item totalling "(.*)"$/,
    async (number: string, from: string, to: string, onBehalfOf: string, total: string) => {
      const res = await createInvoice(ctx, {
        number,
        market: 'external',
        from,
        to,
        onBehalfOf,
        itemTotal: total,
      });
      expect(res.status).toBe(201);
    },
  );
}

function registerMirrorItemsTotal(ctx: Ctx, step: StepFn) {
  step(/^the mirror invoice items should total "(.*)"$/, async (total: string) => {
    const mirror = await fetchMirror(ctx);
    expect(mirror).not.toBeNull();
    expect(mirror!.total).toBe(total);
    expect(mirror!.items).toHaveLength(1);
    expect(mirror!.items[0].total).toBe(total);
  });
}

function registerNoMirrorNumbered(ctx: Ctx, step: StepFn) {
  step(/^no mirror invoice numbered "(.*)" should exist$/, async (number: string) => {
    const res = await request(server())
      .get(`/invoices/search?search=${encodeURIComponent(number)}`)
      .set('Cookie', [ctx.authCookie]);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(0);
  });
}

defineFeature(feature, (test) => {
  beforeAll(async () => {
    await bootstrapApp();
  });
  beforeEach(async () => {
    await cleanDatabase();
  });
  afterAll(async () => {
    await teardownApp();
  });

  test('Creating an on-behalf invoice generates an internal mirror', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerCreateOnBehalfWithItem(ctx, when);
    registerStatus(ctx, then);
    and(/^the response invoice on-behalf actor should be "(.*)"$/, (name: string) => {
      expect(ctx.response.body.onBehalfOfActor).not.toBeNull();
      expect(ctx.response.body.onBehalfOfActor.name).toBe(name);
    });
    and(/^the response invoice should link a mirror numbered "(.*)"$/, (number: string) => {
      expect(ctx.response.body.mirrorInvoice).not.toBeNull();
      expect(ctx.response.body.mirrorInvoice.number).toBe(number);
    });
    and(
      /^the mirror invoice should be internal from "(.*)" to "(.*)"$/,
      async (from: string, to: string) => {
        const mirror = await fetchMirror(ctx);
        expect(mirror).not.toBeNull();
        expect(mirror!.market).toBe('internal');
        expect(mirror!.fromActor.name).toBe(from);
        expect(mirror!.toActor.name).toBe(to);
        expect(mirror!.sourceInvoice).not.toBeNull();
        expect(mirror!.sourceInvoice.id).toBe(ctx.sourceId);
      },
    );
    and(/^the mirror invoice should copy the source dates, currency and paid flag$/, () => {
      const mirror = ctx.mirrorBody!;
      expect(mirror.issuedAt).toBe(ctx.sourceBody.issuedAt);
      expect(mirror.dueAt).toBe(ctx.sourceBody.dueAt);
      expect(mirror.currency.id).toBe(ctx.sourceBody.currency.id);
      expect(mirror.paid).toBe(ctx.sourceBody.paid);
    });
    registerMirrorItemsTotal(ctx, and);
    and(/^the mirror invoice should have no file, link, channel or order$/, () => {
      const mirror = ctx.mirrorBody!;
      expect(mirror.file).toBeNull();
      expect(mirror.link).toBeNull();
      expect(mirror.channel).toBeNull();
      expect(mirror.order).toBeNull();
    });
  });

  test("Mirror items are snapshotted in the sub-actor's functional currency", ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    given(/^a currency value exists named "(.*)"$/, async (name: string) => {
      await createValue(ctx, name);
    });
    and(
      /^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" effective "(.*)"$/,
      async (from: string, to: string, rate: string, effectiveAt: string) => {
        await createRate(ctx, from, to, rate, effectiveAt);
      },
    );
    and(
      /^an actor exists named "(.*)" of type "(.*)" with functional currency "(.*)" under parent "(.*)"$/,
      async (name: string, type: string, currency: string, parent: string) => {
        await createActor(ctx, name, type, currency, parent);
      },
    );
    registerCreateOnBehalfWithItem(ctx, when);
    registerStatus(ctx, then);
    and(/^the mirror invoice from-actor total should be "(.*)"$/, async (total: string) => {
      const mirror = await fetchMirror(ctx);
      expect(mirror).not.toBeNull();
      expect(mirror!.fromActorTotal).toBe(total);
    });
  });

  test('On-behalf is rejected on internal invoices', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    when(
      /^I create an internal invoice numbered "(.*)" from "(.*)" to "(.*)" on behalf of "(.*)"$/,
      async (number: string, from: string, to: string, onBehalfOf: string) => {
        ctx.response = await createInvoice(ctx, {
          number,
          market: 'internal',
          from,
          to,
          onBehalfOf,
        });
      },
    );
    registerStatus(ctx, then);
  });

  test('The on-behalf actor must not be a legal entity', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    given(
      /^an actor exists named "(.*)" of type "(.*)" with functional currency "(.*)" under parent "(.*)"$/,
      async (name: string, type: string, currency: string, parent: string) => {
        await createActor(ctx, name, type, currency, parent);
      },
    );
    when(
      /^I create an external invoice numbered "(.*)" from "(.*)" to "(.*)" on behalf of "(.*)"$/,
      async (number: string, from: string, to: string, onBehalfOf: string) => {
        ctx.response = await createInvoice(ctx, {
          number,
          market: 'external',
          from,
          to,
          onBehalfOf,
        });
      },
    );
    registerStatus(ctx, then);
  });

  test('The on-behalf actor must be a descendant of the issuer', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    given(
      /^an actor exists named "(.*)" of type "(.*)" with functional currency "(.*)"$/,
      async (name: string, type: string, currency: string) => {
        await createActor(ctx, name, type, currency);
      },
    );
    when(
      /^I create an external invoice numbered "(.*)" from "(.*)" to "(.*)" on behalf of "(.*)"$/,
      async (number: string, from: string, to: string, onBehalfOf: string) => {
        ctx.response = await createInvoice(ctx, {
          number,
          market: 'external',
          from,
          to,
          onBehalfOf,
        });
      },
    );
    registerStatus(ctx, then);
  });

  test('A mirror number collision is rejected', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    given(
      /^an internal invoice exists numbered "(.*)" from "(.*)" to "(.*)"$/,
      async (number: string, from: string, to: string) => {
        const res = await createInvoice(ctx, { number, market: 'internal', from, to });
        expect(res.status).toBe(201);
      },
    );
    when(
      /^I create an external invoice numbered "(.*)" from "(.*)" to "(.*)" on behalf of "(.*)"$/,
      async (number: string, from: string, to: string, onBehalfOf: string) => {
        ctx.response = await createInvoice(ctx, {
          number,
          market: 'external',
          from,
          to,
          onBehalfOf,
        });
      },
    );
    registerStatus(ctx, then);
  });

  test('Updating the source regenerates the mirror', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerExistingOnBehalf(ctx, given);
    when(/^I update the invoice items to a single item totalling "(.*)"$/, async (total: string) => {
      ctx.response = await request(server())
        .patch(`/invoices/${ctx.sourceId}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ items: [{ quantity: '1.00', unitPrice: total, total }] });
    });
    registerStatus(ctx, then);
    registerMirrorItemsTotal(ctx, and);
  });

  test('Marking the source paid propagates to the mirror', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerExistingOnBehalf(ctx, given);
    when(/^I update the invoice as paid$/, async () => {
      ctx.response = await request(server())
        .patch(`/invoices/${ctx.sourceId}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ paid: true });
    });
    registerStatus(ctx, then);
    and(/^the mirror invoice should be paid$/, async () => {
      const mirror = await fetchMirror(ctx);
      expect(mirror).not.toBeNull();
      expect(mirror!.paid).toBe(true);
    });
  });

  test('Clearing on-behalf deletes the mirror', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerExistingOnBehalf(ctx, given);
    when(/^I clear the invoice's on-behalf actor$/, async () => {
      ctx.response = await request(server())
        .patch(`/invoices/${ctx.sourceId}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ onBehalfOfActorId: null });
    });
    registerStatus(ctx, then);
    and(/^the response invoice should have no mirror$/, () => {
      expect(ctx.response.body.mirrorInvoice).toBeNull();
      expect(ctx.response.body.onBehalfOfActor).toBeNull();
    });
    registerNoMirrorNumbered(ctx, and);
  });

  test('Deleting the source deletes the mirror', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerExistingOnBehalf(ctx, given);
    when(/^I delete the invoice$/, async () => {
      ctx.response = await request(server())
        .delete(`/invoices/${ctx.sourceId}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1');
    });
    registerStatus(ctx, then);
    registerNoMirrorNumbered(ctx, and);
  });

  test('A mirror cannot be updated directly', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerExistingOnBehalf(ctx, given);
    when(/^I attempt to update the mirror invoice$/, async () => {
      const mirror = await fetchMirror(ctx);
      ctx.response = await request(server())
        .patch(`/invoices/${mirror!.id}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1')
        .send({ paid: true });
    });
    registerStatus(ctx, then);
  });

  test('A mirror cannot be deleted directly', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerExistingOnBehalf(ctx, given);
    when(/^I attempt to delete the mirror invoice$/, async () => {
      const mirror = await fetchMirror(ctx);
      ctx.response = await request(server())
        .delete(`/invoices/${mirror!.id}`)
        .set('Cookie', [ctx.authCookie])
        .set('X-CSRF-Protection', '1');
    });
    registerStatus(ctx, then);
  });

  test('Search can exclude mirrors', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerExistingOnBehalf(ctx, given);
    when(/^I search invoices with mirror filter "(.*)"$/, async (mirror: string) => {
      ctx.response = await request(server())
        .get(`/invoices/search?mirror=${mirror}`)
        .set('Cookie', [ctx.authCookie]);
    });
    registerStatus(ctx, then);
    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(ctx.response.body.meta.total).toBe(parseInt(count));
    });
    and(/^the search results should contain number "(.*)"$/, (number: string) => {
      const numbers = ctx.response.body.data.map((i: { number: string }) => i.number);
      expect(numbers).toContain(number);
    });
  });

  test('Search can return only mirrors', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    registerExistingOnBehalf(ctx, given);
    when(/^I search invoices with mirror filter "(.*)"$/, async (mirror: string) => {
      ctx.response = await request(server())
        .get(`/invoices/search?mirror=${mirror}`)
        .set('Cookie', [ctx.authCookie]);
    });
    registerStatus(ctx, then);
    and(/^the total count should be (\d+)$/, (count: string) => {
      expect(ctx.response.body.meta.total).toBe(parseInt(count));
    });
    and(/^the search results should contain number "(.*)"$/, (number: string) => {
      const numbers = ctx.response.body.data.map((i: { number: string }) => i.number);
      expect(numbers).toContain(number);
    });
    and(
      /^each search result should reference source invoice number "(.*)"$/,
      (number: string) => {
        for (const row of ctx.response.body.data) {
          expect(row.sourceInvoice).not.toBeNull();
          expect(row.sourceInvoice.number).toBe(number);
        }
      },
    );
  });
});
