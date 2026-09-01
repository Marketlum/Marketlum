import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tension } from './entities/tension.entity';
import { Actor } from '../actors/entities/actor.entity';
import { User } from '../users/entities/user.entity';
import { EventsModule } from '../events/events.module';
import { EventStoreModule } from '../events/store/event-store.module';
import { TensionsService } from './tensions.service';
import { TensionsController } from './tensions.controller';
import { TensionHistoryService } from './tension-history.service';
import { TensionCommandRunner } from './tension-command.runner';
import { TensionProjector } from './tension.projector';
import { TensionRebuildService } from './tension-rebuild.service';
import { TENSION_COMMAND_HANDLERS } from './commands';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tension, Actor, User]),
    CqrsModule,
    EventStoreModule,
    // The command runner publishes marketlum.tension.<verb> on the bus.
    EventsModule,
  ],
  controllers: [TensionsController],
  providers: [
    TensionsService,
    TensionHistoryService,
    TensionCommandRunner,
    TensionProjector,
    TensionRebuildService,
    ...TENSION_COMMAND_HANDLERS,
  ],
  // TensionsService and the command bus are consumed by MCP tools, the search
  // service, the seeder and ActorsService's deletion cascade (spec 027 Q7).
  exports: [TensionsService, TensionRebuildService, TensionCommandRunner, CqrsModule],
})
export class TensionsModule {}
