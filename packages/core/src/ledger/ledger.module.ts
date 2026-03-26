import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { Transaction } from './entities/transaction.entity';
import { Value } from '../values/entities/value.entity';
import { Agent } from '../agents/entities/agent.entity';
import { AccountsService } from './accounts.service';
import { TransactionsService } from './transactions.service';
import { AccountsController } from './accounts.controller';
import { TransactionsController } from './transactions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Account, Transaction, Value, Agent])],
  controllers: [AccountsController, TransactionsController],
  providers: [AccountsService, TransactionsService],
  exports: [AccountsService, TransactionsService],
})
export class LedgerModule {}
