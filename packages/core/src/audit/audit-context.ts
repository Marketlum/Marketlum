import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';

/**
 * Per-request actor context for audit attribution (spec 026 Q2). Opened by the
 * middleware below; auth strategies merge the user in after validation. Code
 * running outside a request (CLI, seeders) sees no store — those audit
 * entries become actorKind=system.
 */
export interface AuditRequestContext {
  userId?: string;
  userEmail?: string;
  userName?: string;
  userType?: string;
  apiKeyId?: string;
  apiKeyName?: string;
  ip?: string;
  userAgent?: string;
}

const storage = new AsyncLocalStorage<AuditRequestContext>();

export const AuditContext = {
  run<T>(ctx: AuditRequestContext, fn: () => T): T {
    return storage.run(ctx, fn);
  },
  get(): AuditRequestContext | undefined {
    return storage.getStore();
  },
  /** No-op outside a request — strategies can call unconditionally. */
  merge(patch: Partial<AuditRequestContext>): void {
    const store = storage.getStore();
    if (store) Object.assign(store, patch);
  },
};

export function auditContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  AuditContext.run(
    { ip: req.ip, userAgent: req.headers['user-agent'] as string | undefined },
    () => next(),
  );
}
