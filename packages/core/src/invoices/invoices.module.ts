import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Value } from '../values/entities/value.entity';
import { ValueInstance } from '../value-instances/entities/value-instance.entity';
import { ValueStream } from '../value-streams/entities/value-stream.entity';
import { File } from '../files/entities/file.entity';
import { Channel } from '../channels/channel.entity';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceItem,
      Agent,
      Value,
      ValueInstance,
      ValueStream,
      File,
      Channel,
    ]),
    ExchangeRatesModule,
    SystemSettingsModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
