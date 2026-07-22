import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Value } from '../values/entities/value.entity';
import { ValueInstance } from '../value-instances/entities/value-instance.entity';
import { File } from '../files/entities/file.entity';
import { Channel } from '../channels/channel.entity';
import { Order } from '../orders/entities/order.entity';
import { InvoicesService } from './invoices.service';
import { InvoiceImportService } from './invoice-import.service';
import { AgentFinancialsService } from './agent-financials.service';
import { InvoicesController } from './invoices.controller';
import { AgentFinancialsController } from './agent-financials.controller';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { AiModule } from '../ai/ai.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceItem,
      Agent,
      Value,
      ValueInstance,
      File,
      Channel,
      Order,
    ]),
    ExchangeRatesModule,
    SystemSettingsModule,
    AiModule,
    FilesModule,
  ],
  controllers: [InvoicesController, AgentFinancialsController],
  providers: [InvoicesService, InvoiceImportService, AgentFinancialsService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
