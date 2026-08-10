import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditCategory, DomainEventEnvelope } from '@marketlum/shared';
import { AuditService } from './audit.service';

const VERBS = new Set(['created', 'updated', 'deleted']);

/**
 * Persists every domain event as a mutation audit entry (spec 026 Q1).
 * Timing is inherited from the bus: events emit post-commit, so capture is
 * post-commit best-effort (Q9) — AuditService.record never throws.
 */
@Injectable()
export class AuditTrailHandler {
  constructor(private readonly auditService: AuditService) {}

  @OnEvent('marketlum.**', { async: true })
  async handle(event: DomainEventEnvelope): Promise<void> {
    // marketlum.<entity>.<verb> | marketlum.plugin.<id>.<entity>.<verb>
    const segments = event.name.split('.');
    const verb = segments[segments.length - 1];
    if (!VERBS.has(verb)) return;
    const entityType = segments.slice(1, -1).join('.');

    await this.auditService.record(AuditCategory.MUTATION, {
      entityType,
      entityId: event.payload.id,
      action: verb,
      context: (event.payload.entity ?? {}) as Record<string, unknown>,
    });
  }
}
