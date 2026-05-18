import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DomainEventBus } from './domain-event-bus.service';
import { DomainEventSubscriber } from './domain-event.subscriber';
import { LoggingEventHandler } from './logging-event.handler';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 50,
      verboseMemoryLeak: true,
    }),
  ],
  providers: [DomainEventBus, DomainEventSubscriber, LoggingEventHandler],
  exports: [DomainEventBus],
})
export class EventsModule {}
