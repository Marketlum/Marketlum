import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exchange } from './entities/exchange.entity';
import { ExchangeParty } from './entities/exchange-party.entity';
import { ExchangeFlow } from './entities/exchange-flow.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Value } from '../values/entities/value.entity';
import { ValueInstance } from '../value-instances/entities/value-instance.entity';
import { ValueStream } from '../value-streams/entities/value-stream.entity';
import { Channel } from '../channels/channel.entity';
import { Pipeline } from '../pipelines/entities/pipeline.entity';
import { User } from '../users/entities/user.entity';
import { Tension } from '../tensions/entities/tension.entity';
import { ExchangesService } from './exchanges.service';
import { ExchangeFlowsService } from './exchange-flows.service';
import { ExchangesController } from './exchanges.controller';
import { ExchangeFlowsController } from './exchange-flows.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exchange,
      ExchangeParty,
      ExchangeFlow,
      Agent,
      Value,
      ValueInstance,
      ValueStream,
      Channel,
      Pipeline,
      User,
      Tension,
    ]),
  ],
  controllers: [ExchangesController, ExchangeFlowsController],
  providers: [ExchangesService, ExchangeFlowsService],
  exports: [ExchangesService, ExchangeFlowsService],
})
export class ExchangesModule {}
