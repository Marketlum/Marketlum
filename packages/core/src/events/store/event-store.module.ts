import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DomainEvent } from './domain-event.entity';
import { EventStore } from './event-store.service';

@Module({
  imports: [TypeOrmModule.forFeature([DomainEvent])],
  providers: [EventStore],
  exports: [EventStore, TypeOrmModule],
})
export class EventStoreModule {}
