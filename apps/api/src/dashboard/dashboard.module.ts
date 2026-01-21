import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Agent } from '../agents/entities/agent.entity';
import { Agreement } from '../agreements/entities/agreement.entity';
import { Value } from '../value/entities/value.entity';
import { ValueStream } from '../value_streams/entities/value_stream.entity';
import { User } from '../users/entities/user.entity';
import { FileUpload } from '../files/entities/file-upload.entity';
import { Account } from '../ledger/entities/account.entity';
import { Transaction } from '../ledger/entities/transaction.entity';
import { Geography } from '../geographies/entities/geography.entity';
import { Taxonomy } from '../taxonomies/entities/taxonomy.entity';
import { Channel } from '../channels/entities/channel.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Agent,
      Agreement,
      Value,
      ValueStream,
      User,
      FileUpload,
      Account,
      Transaction,
      Geography,
      Taxonomy,
      Channel,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
