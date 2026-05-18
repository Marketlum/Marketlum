import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface EmitArgs<TEntity = unknown> {
  name: string;
  id: string;
  code?: string;
  entity: TEntity;
}

@Injectable()
export class DomainEventBus {
  constructor(private readonly emitter: EventEmitter2) {}

  emit<TEntity>(args: EmitArgs<TEntity>): void {
    this.emitter.emit(args.name, {
      name: args.name,
      occurredAt: new Date().toISOString(),
      payload: { id: args.id, code: args.code, entity: args.entity },
    });
  }
}
