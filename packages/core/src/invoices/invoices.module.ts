import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Actor } from '../actors/entities/actor.entity';
import { Value } from '../values/entities/value.entity';
import { ValueInstance } from '../value-instances/entities/value-instance.entity';
import { File } from '../files/entities/file.entity';
import { Channel } from '../channels/channel.entity';
import { Order } from '../orders/entities/order.entity';
import { InvoicesService } from './invoices.service';
import { InvoiceImportService } from './invoice-import.service';
import { ActorFinancialsService } from './actor-financials.service';
import { InvoicesController } from './invoices.controller';
import { ActorFinancialsController } from './actor-financials.controller';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { AiModule } from '../ai/ai.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceItem,
      Actor,
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
  controllers: [InvoicesController, ActorFinancialsController],
  providers: [InvoicesService, InvoiceImportService, ActorFinancialsService],
  exports: [InvoicesService, ActorFinancialsService],
})
export class InvoicesModule {}
