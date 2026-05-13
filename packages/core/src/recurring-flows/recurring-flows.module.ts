import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecurringFlow } from './entities/recurring-flow.entity';
import { ValueStream } from '../value-streams/entities/value-stream.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Value } from '../values/entities/value.entity';
import { Offering } from '../offerings/entities/offering.entity';
import { Agreement } from '../agreements/entities/agreement.entity';
import { Taxonomy } from '../taxonomies/entities/taxonomy.entity';
import { RecurringFlowsService } from './recurring-flows.service';
import { RecurringFlowsRollupService } from './rollup.service';
import { RecurringFlowsProjectionService } from './projection.service';
import { RecurringFlowsController } from './recurring-flows.controller';
import { ValueStreamRecurringFlowsController } from './value-stream-recurring-flows.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecurringFlow, ValueStream, Agent, Value, Offering, Agreement, Taxonomy]),
  ],
  controllers: [RecurringFlowsController, ValueStreamRecurringFlowsController],
  providers: [RecurringFlowsService, RecurringFlowsRollupService, RecurringFlowsProjectionService],
  exports: [RecurringFlowsService, RecurringFlowsRollupService, RecurringFlowsProjectionService],
})
export class RecurringFlowsModule {}
