import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { PluginSettingsService } from '@marketlum/core';
import {
  bootstrapApp,
  cleanDatabase,
  teardownApp,
  getApp,
  createAuthenticatedUser,
  getFakeNbpClient,
} from '../../setup';

const feature = loadFeature(
  path.resolve(__dirname, '../../../../../packages/plugin-nbp/features/ingest.feature'),
);

interface Ctx {
  authCookie: string;
  currencies: Map<string, string>; // ISO code -> Value id
  response: request.Response;
}

const makeCtx = (): Ctx => ({ authCookie: '', currencies: new Map(), response: undefined as never });

async function ensureCurrency(ctx: Ctx, name: string, code: string): Promise<void> {
  // Core `code` is snake_case/lowercase; store lowercased but key the map by the
  // ISO code the feature/NBP use.
  const res = await request(getApp().getHttpServer())
    .post('/values')
    .set('Cookie', [ctx.authCookie])
    .set('X-CSRF-Protection', '1')
    .send({ code: code.toLowerCase(), name, type: 'currency', purpose: `Currency ${code}` });
  ctx.currencies.set(code, res.body.id);
}

async function trackCurrencies(codes: string[]): Promise<void> {
  await getApp()
    .get(PluginSettingsService)
    .set('nbp', { enabled: true, cron: '0 30 12 * * 1-5', trackedCurrencies: codes });
}

async function triggerRefresh(ctx: Ctx, authenticated = true): Promise<void> {
  const req = request(getApp().getHttpServer())
    .post('/plugins/nbp/refresh')
    .set('X-CSRF-Protection', '1');
  if (authenticated) req.set('Cookie', [ctx.authCookie]);
  ctx.response = await req;
}

async function lookupRate(ctx: Ctx, from: string, to: string, at: string) {
  return request(getApp().getHttpServer())
    .get('/exchange-rates/lookup')
    .query({ fromValueId: ctx.currencies.get(from), toValueId: ctx.currencies.get(to), at })
    .set('Cookie', [ctx.authCookie]);
}

async function countPairRows(ctx: Ctx, a: string, b: string, source?: string): Promise<number> {
  const ds = getApp().get(DataSource);
  const idA = ctx.currencies.get(a);
  const idB = ctx.currencies.get(b);
  const sourceClause = source ? 'AND source = $3' : '';
  const params = source ? [idA, idB, source] : [idA, idB];
  const rows = await ds.query(
    `SELECT count(*)::int AS n FROM exchange_rates
     WHERE (("fromValueId" = $1 AND "toValueId" = $2) OR ("fromValueId" = $2 AND "toValueId" = $1))
     ${sourceClause}`,
    params,
  );
  return rows[0].n;
}

type StepFn = (regex: RegExp | string, fn: (...args: never[]) => unknown) => void;

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

  function registerBackground(ctx: Ctx, given: StepFn, and: StepFn) {
    given(/^I am authenticated as "(.*)"$/, async (email: string) => {
      ctx.authCookie = await createAuthenticatedUser(email, 'password123');
    });
    and(/^a currency value exists named "(.*)" with code "(.*)"$/, async (name: string, code: string) => {
      await ensureCurrency(ctx, name, code);
    });
    and(/^a currency value exists named "(.*)" with code "(.*)"$/, async (name: string, code: string) => {
      await ensureCurrency(ctx, name, code);
    });
    and(/^a currency value exists named "(.*)" with code "(.*)"$/, async (name: string, code: string) => {
      await ensureCurrency(ctx, name, code);
    });
  }

  const provideRate = (and: StepFn) =>
    and(
      /^the NBP table A response provides a mid rate of "(.*)" for "(.*)" effective "(.*)"$/,
      (mid: string, code: string, date: string) => {
        getFakeNbpClient().setRate(code, Number(mid), date);
      },
    );

  const statusThen = (then: StepFn, ctx: Ctx) =>
    then(/^the response status should be (\d+)$/, (status: string) => {
      expect(ctx.response.status).toBe(parseInt(status));
    });

  const lookupThen = (and: StepFn, ctx: Ctx) =>
    and(
      /^looking up the exchange rate from "(.*)" to "(.*)" as of "(.*)" returns "(.*)"$/,
      async (from: string, to: string, at: string, expected: string) => {
        const res = await lookupRate(ctx, from, to, at);
        expect(res.body).not.toBeNull();
        expect(Math.abs(Number(res.body.rate) - Number(expected))).toBeLessThan(1e-6);
      },
    );

  const updatedThen = (and: StepFn, ctx: Ctx) =>
    and(/^the refresh summary reports (\d+) currenc(?:y|ies) updated$/, (n: string) => {
      expect(ctx.response.body.updated).toHaveLength(parseInt(n));
    });

  test('A manual refresh ingests a tracked currency as an NBP-sourced rate', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    given(/^the NBP plugin is configured to track "(.*)"$/, async (code: string) => {
      await trackCurrencies([code]);
    });
    provideRate(and);
    when(/^I trigger an NBP refresh$/, async () => {
      await triggerRefresh(ctx);
    });
    statusThen(then, ctx);
    updatedThen(and, ctx);
    lookupThen(and, ctx);
    and(/^exactly one exchange rate for the "(.*)"\/"(.*)" pair has source "(.*)"$/,
      async (a: string, b: string, source: string) => {
        expect(await countPairRows(ctx, a, b, source)).toBe(1);
      });
  });

  test('Currencies the admin does not track are not ingested', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    given(/^the NBP plugin is configured to track "(.*)"$/, async (code: string) => {
      await trackCurrencies([code]);
    });
    provideRate(and);
    provideRate(and);
    when(/^I trigger an NBP refresh$/, async () => {
      await triggerRefresh(ctx);
    });
    statusThen(then, ctx);
    updatedThen(and, ctx);
    and(/^no exchange rate exists for the "(.*)"\/"(.*)" pair$/, async (a: string, b: string) => {
      expect(await countPairRows(ctx, a, b)).toBe(0);
    });
  });

  test('A tracked currency without a matching value is skipped and reported', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    given(/^the NBP plugin is configured to track "(.*)" and "(.*)"$/, async (a: string, b: string) => {
      await trackCurrencies([a, b]);
    });
    provideRate(and);
    provideRate(and);
    when(/^I trigger an NBP refresh$/, async () => {
      await triggerRefresh(ctx);
    });
    statusThen(then, ctx);
    updatedThen(and, ctx);
    and(/^the refresh summary reports "(.*)" as skipped$/, (code: string) => {
      expect(ctx.response.body.skipped).toContain(code);
    });
  });

  test('A manually entered rate is never overwritten by NBP', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    given(/^the NBP plugin is configured to track "(.*)"$/, async (code: string) => {
      await trackCurrencies([code]);
    });
    and(
      /^an exchange rate exists from "(.*)" to "(.*)" with rate "(.*)" at "(.*)"$/,
      async (from: string, to: string, rate: string, effectiveAt: string) => {
        await request(getApp().getHttpServer())
          .post('/exchange-rates')
          .set('Cookie', [ctx.authCookie])
          .set('X-CSRF-Protection', '1')
          .send({
            fromValueId: ctx.currencies.get(from),
            toValueId: ctx.currencies.get(to),
            rate,
            effectiveAt,
          });
      },
    );
    provideRate(and);
    when(/^I trigger an NBP refresh$/, async () => {
      await triggerRefresh(ctx);
    });
    statusThen(then, ctx);
    updatedThen(and, ctx);
    lookupThen(and, ctx);
  });

  test('Re-running the refresh is idempotent and updates the NBP row in place', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    given(/^the NBP plugin is configured to track "(.*)"$/, async (code: string) => {
      await trackCurrencies([code]);
    });
    provideRate(and);
    when(/^I trigger an NBP refresh$/, async () => {
      await triggerRefresh(ctx);
    });
    and(
      /^the NBP table A response provides a revised mid rate of "(.*)" for "(.*)" effective "(.*)"$/,
      (mid: string, code: string, date: string) => {
        getFakeNbpClient().setRate(code, Number(mid), date);
      },
    );
    and(/^I trigger an NBP refresh$/, async () => {
      await triggerRefresh(ctx);
    });
    statusThen(then, ctx);
    and(/^exactly one exchange rate for the "(.*)"\/"(.*)" pair has source "(.*)"$/,
      async (a: string, b: string, source: string) => {
        expect(await countPairRows(ctx, a, b, source)).toBe(1);
      });
    lookupThen(and, ctx);
  });

  test('An unauthenticated user cannot trigger a refresh', ({ given, and, when, then }) => {
    const ctx = makeCtx();
    registerBackground(ctx, given, and);
    when('I trigger an NBP refresh without authentication', async () => {
      await triggerRefresh(ctx, false);
    });
    statusThen(then, ctx);
  });
});
