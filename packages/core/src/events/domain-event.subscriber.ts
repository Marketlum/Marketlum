import { Injectable } from '@nestjs/common';
import {
  DataSource,
  EntitySubscriberInterface,
  InsertEvent,
  QueryRunner,
  RemoveEvent,
  TransactionCommitEvent,
  TransactionRollbackEvent,
  UpdateEvent,
} from 'typeorm';
import { DomainEventBus } from './domain-event-bus.service';
import { primaryEntitySnakeName } from './primary-entities';

type Pending = { name: string; id: string; code?: string; entity: unknown };

const BUFFER_KEY = Symbol('marketlumPendingEvents');

type WithBuffer = Record<symbol, Pending[] | undefined>;

@Injectable()
export class DomainEventSubscriber implements EntitySubscriberInterface {
  constructor(dataSource: DataSource, private readonly bus: DomainEventBus) {
    dataSource.subscribers.push(this);
  }

  afterInsert(event: InsertEvent<unknown>): void {
    this.handle(event.metadata.target, event.entity, 'created', event.queryRunner);
  }

  afterUpdate(event: UpdateEvent<unknown>): void {
    this.handle(
      event.metadata.target,
      event.entity ?? event.databaseEntity,
      'updated',
      event.queryRunner,
    );
  }

  afterRemove(event: RemoveEvent<unknown>): void {
    const entity = event.databaseEntity ?? event.entity;
    const idOverride = event.entityId != null ? String(event.entityId) : undefined;
    this.handle(event.metadata.target, entity, 'deleted', event.queryRunner, idOverride);
  }

  afterTransactionCommit(event: TransactionCommitEvent): void {
    const buffer = this.takeBuffer(event.queryRunner);
    for (const pending of buffer) {
      this.bus.emit(pending);
    }
  }

  afterTransactionRollback(event: TransactionRollbackEvent): void {
    this.takeBuffer(event.queryRunner);
  }

  private handle(
    target: Function | string,
    entity: unknown,
    verb: 'created' | 'updated' | 'deleted',
    queryRunner: QueryRunner | undefined,
    idOverride?: string,
  ): void {
    const snake = primaryEntitySnakeName(target);
    if (!snake) return;
    if (!entity || typeof entity !== 'object') return;

    let id = idOverride;
    if (!id) {
      const rawId = (entity as { id?: string | number }).id;
      if (rawId === undefined || rawId === null) return;
      id = String(rawId);
    }
    if (!id) return;

    const code = (entity as { code?: string }).code;
    const pending: Pending = { name: `marketlum.${snake}.${verb}`, id, code, entity };

    if (queryRunner?.isTransactionActive) {
      this.getBuffer(queryRunner).push(pending);
    } else {
      this.bus.emit(pending);
    }
  }

  private getBuffer(qr: QueryRunner): Pending[] {
    const data = qr.data as WithBuffer;
    if (!data[BUFFER_KEY]) data[BUFFER_KEY] = [];
    return data[BUFFER_KEY]!;
  }

  private takeBuffer(qr: QueryRunner): Pending[] {
    const data = qr.data as WithBuffer;
    const existing = data[BUFFER_KEY] ?? [];
    delete data[BUFFER_KEY];
    return existing;
  }
}
