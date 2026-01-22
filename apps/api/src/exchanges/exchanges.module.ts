import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExchangesService } from './exchanges.service';
import { ExchangesController } from './exchanges.controller';
import { Exchange } from './entities/exchange.entity';
import { ExchangeParty } from './entities/exchange-party.entity';
import { ExchangeFlow } from './entities/exchange-flow.entity';
import { ValueStream } from '../value_streams/entities/value_stream.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Value } from '../value/entities/value.entity';
import { Channel } from '../channels/entities/channel.entity';
import { Taxonomy } from '../taxonomies/entities/taxonomy.entity';
import { User } from '../users/entities/user.entity';
import { Agreement } from '../agreements/entities/agreement.entity';
import { AgreementParty } from '../agreements/entities/agreement-party.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exchange,
      ExchangeParty,
      ExchangeFlow,
      ValueStream,
      Agent,
      Value,
      Channel,
      Taxonomy,
      User,
      Agreement,
      AgreementParty,
    ]),
  ],
  controllers: [ExchangesController],
  providers: [ExchangesService],
  exports: [ExchangesService],
})
export class ExchangesModule {}
