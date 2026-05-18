import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

export interface RecordedEvent {
  name: string;
  occurredAt: string;
  payload: { id: string; code?: string; entity: unknown };
}

@Injectable()
export class EventRecorder {
  private events: RecordedEvent[] = [];

  @OnEvent('marketlum.**')
  capture(event: RecordedEvent): void {
    this.events.push(event);
  }

  getAll(): RecordedEvent[] {
    return [...this.events];
  }

  getByName(name: string): RecordedEvent[] {
    return this.events.filter((e) => e.name === name);
  }

  getByPrefix(prefix: string): RecordedEvent[] {
    return this.events.filter((e) => e.name.startsWith(prefix));
  }

  clear(): void {
    this.events.length = 0;
  }
}
