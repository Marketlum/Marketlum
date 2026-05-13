import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSetting } from './entities/system-setting.entity';
import { Value } from '../values/entities/value.entity';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';
import { RecurringFlow } from '../recurring-flows/entities/recurring-flow.entity';
import { SystemSettingsService } from './system-settings.service';
import { SystemSettingsController } from './system-settings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemSetting, Value, InvoiceItem, RecurringFlow]),
  ],
  controllers: [SystemSettingsController],
  providers: [SystemSettingsService],
  exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
