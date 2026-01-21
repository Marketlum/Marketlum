import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerService } from './ledger.service';
import { LedgerController } from './ledger.controller';
import { Account } from './entities/account.entity';
import { Transaction } from './entities/transaction.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Value } from '../value/entities/value.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Account, Transaction, Agent, Value])],
  controllers: [LedgerController],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
