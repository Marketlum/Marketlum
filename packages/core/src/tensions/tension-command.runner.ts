import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  TENSION_AGGREGATE_TYPE,
  TENSION_EVENT_SCHEMA_VERSION,
  TensionEventType,
  tensionEventBusName,
} from '@marketlum/shared';
import { DomainEventBus } from '../events/domain-event-bus.service';
import { EventStore, type NewDomainEvent } from '../events/store/event-store.service';
import type { DomainEvent } from '../events/store/domain-event.entity';
import { TensionProjector } from './tension.projector';
import {
  applyTensionEvent,
  isLive,
  reconstitute,
  type TensionAggregateState,
  type TensionStreamEvent,
} from './tension.reducer';

/** A fact a command decided to record; the runner fills in the envelope. */
export interface DecidedEvent {
  type: TensionEventType;
  payload: Record<string, unknown>;
}

function toStreamEvents(rows: DomainEvent[]): TensionStreamEvent[] {
  return rows.map((row) => ({
    type: row.type as TensionEventType,
    payload: row.payload,
    version: row.version,
    occurredAt: row.occurredAt,
  }));
}

/**
 * The one place the load → guard → append → project → commit → emit cycle
 * lives, so all eleven command handlers stay small and cannot drift from each
 * other. Appends and the projection write share a transaction (spec 027 Q16);
 * bus emission happens only after it commits.
 */
@Injectable()
export class TensionCommandRunner {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly eventStore: EventStore,
    private readonly projector: TensionProjector,
    private readonly bus: DomainEventBus,
  ) {}

  /** Genesis: creates a new stream at version 1. */
  async sense(aggregateId: string, event: DecidedEvent): Promise<void> {
    const appended = await this.dataSource.transaction(async (manager) =>
      this.appendAndProject(manager, aggregateId, null, 0, [event]),
    );
    this.publish(aggregateId, appended);
  }

  /**
   * Loads the aggregate, lets `decide` choose which events (if any) to record,
   * then appends and projects. An empty decision is a no-op: the current state
   * is returned and nothing is written (spec 027 §2.1).
   */
  async amend(
    aggregateId: string,
    decide: (state: TensionAggregateState) => DecidedEvent[],
  ): Promise<void> {
    const appended = await this.dataSource.transaction((manager) =>
      this.amendWithin(manager, aggregateId, decide),
    );
    this.publish(aggregateId, appended);
  }

  /**
   * The body of `amend`, run inside a transaction the caller already owns.
   *
   * Exists for the actor-deletion cascade (spec 027 §7.1), which must discard
   * an actor's tensions and delete the actor atomically — the RESTRICT FK
   * rejects the delete otherwise. Callers are responsible for calling
   * `publish()` with the returned events once their transaction commits.
   */
  async amendWithin(
    manager: EntityManager,
    aggregateId: string,
    decide: (state: TensionAggregateState) => DecidedEvent[],
  ): Promise<DomainEvent[]> {
    const stored = await this.eventStore.readStream(TENSION_AGGREGATE_TYPE, aggregateId, manager);
    const state = reconstitute(aggregateId, toStreamEvents(stored));
    if (!isLive(state)) throw new NotFoundException('Tension not found');

    const decided = decide(state);
    if (decided.length === 0) return [];

    return this.appendAndProject(manager, aggregateId, state, state.version, decided);
  }

  private async appendAndProject(
    manager: EntityManager,
    aggregateId: string,
    state: TensionAggregateState | null,
    expectedVersion: number,
    decided: DecidedEvent[],
  ): Promise<DomainEvent[]> {
    const events: NewDomainEvent[] = decided.map((event) => ({
      type: event.type,
      payload: event.payload,
      schemaVersion: TENSION_EVENT_SCHEMA_VERSION,
    }));

    const appended = await this.eventStore.append(
      manager,
      TENSION_AGGREGATE_TYPE,
      aggregateId,
      expectedVersion,
      events,
    );

    const next = toStreamEvents(appended).reduce<TensionAggregateState | null>(
      (acc, event) => applyTensionEvent(acc, event, aggregateId),
      state,
    );
    await this.projector.apply(manager, aggregateId, next);
    return appended;
  }

  /**
   * Post-commit bus emission with intent-carrying names (spec 027 Q13):
   * `marketlum.tension.<verb>` instead of the created/updated/deleted triplet
   * the TypeORM subscriber used to derive.
   */
  publish(aggregateId: string, appended: DomainEvent[]): void {
    for (const event of appended) {
      this.bus.emit({
        name: tensionEventBusName(event.type as TensionEventType),
        id: aggregateId,
        entity: { id: aggregateId, version: event.version, ...event.payload },
      });
    }
  }
}
