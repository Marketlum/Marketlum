import { ConflictException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { AuditActorKind, UserType } from '@marketlum/shared';
import { AuditContext } from '../../audit/audit-context';
import { DomainEvent } from './domain-event.entity';

/** A fact to append; envelope fields are filled in by the store. */
export interface NewDomainEvent {
  type: string;
  payload: Record<string, unknown>;
  schemaVersion?: number;
  causationId?: string | null;
}

const UNIQUE_VIOLATION = '23505';

/**
 * The append-only store behind event-sourced aggregates (spec 027 §3.3).
 *
 * Appends always run inside a caller-supplied transaction so that the event and
 * the projection it implies commit together (Q16). Concurrency is optimistic
 * (Q5): a racing writer violates UQ_domain_events_stream_version and gets a 409.
 */
@Injectable()
export class EventStore {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Appends `events` at `expectedVersion + 1 …`. Returns the stored rows so the
   * caller can emit them on the bus after the transaction commits.
   */
  async append(
    manager: EntityManager,
    aggregateType: string,
    aggregateId: string,
    expectedVersion: number,
    events: NewDomainEvent[],
  ): Promise<DomainEvent[]> {
    if (events.length === 0) return [];

    const attribution = this.attribution();
    const rows = events.map((event, index) =>
      manager.create(DomainEvent, {
        aggregateType,
        aggregateId,
        version: expectedVersion + index + 1,
        type: event.type,
        schemaVersion: event.schemaVersion ?? 1,
        payload: event.payload,
        occurredAt: new Date(),
        causationId: event.causationId ?? null,
        ...attribution,
      }),
    );

    try {
      return await manager.save(DomainEvent, rows);
    } catch (error) {
      if (error instanceof QueryFailedError && (error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'The tension changed while this request was in flight; reload and retry.',
        );
      }
      throw error;
    }
  }

  /** Full stream in version order. */
  async readStream(
    aggregateType: string,
    aggregateId: string,
    manager?: EntityManager,
  ): Promise<DomainEvent[]> {
    const repo = (manager ?? this.dataSource.manager).getRepository(DomainEvent);
    return repo.find({
      where: { aggregateType, aggregateId },
      order: { version: 'ASC' },
    });
  }

  /** Head version of a stream; 0 when the stream does not exist yet. */
  async currentVersion(
    aggregateType: string,
    aggregateId: string,
    manager?: EntityManager,
  ): Promise<number> {
    const repo = (manager ?? this.dataSource.manager).getRepository(DomainEvent);
    const row = await repo.findOne({
      where: { aggregateType, aggregateId },
      order: { version: 'DESC' },
      select: { version: true },
    });
    return row?.version ?? 0;
  }

  /** Every aggregate id that has a stream — drives the rebuild (spec 027 §4.1). */
  async listAggregateIds(aggregateType: string): Promise<string[]> {
    const rows: { aggregateId: string }[] = await this.dataSource
      .getRepository(DomainEvent)
      .createQueryBuilder('e')
      .select('DISTINCT e."aggregateId"', 'aggregateId')
      .where('e."aggregateType" = :aggregateType', { aggregateType })
      .orderBy('"aggregateId"', 'ASC')
      .getRawMany();
    return rows.map((r) => r.aggregateId);
  }

  /**
   * Attribution from the request-scoped ALS (spec 026). Outside a request —
   * seeders, the CLI, the migration backfill — this yields actorKind=system.
   * The correlation id is minted once per request and reused thereafter.
   */
  private attribution() {
    const ctx = AuditContext.get();
    if (ctx && !ctx.correlationId) {
      AuditContext.merge({ correlationId: randomUUID() });
    }

    const hasUser = Boolean(ctx?.userId);
    return {
      actorKind: hasUser
        ? ctx?.userType === UserType.AGENT
          ? AuditActorKind.AGENT
          : AuditActorKind.HUMAN
        : AuditActorKind.SYSTEM,
      userId: ctx?.userId ?? null,
      userEmail: ctx?.userEmail ?? null,
      userName: ctx?.userName ?? null,
      apiKeyId: ctx?.apiKeyId ?? null,
      apiKeyName: ctx?.apiKeyName ?? null,
      ip: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
      correlationId: AuditContext.get()?.correlationId ?? null,
    };
  }
}
