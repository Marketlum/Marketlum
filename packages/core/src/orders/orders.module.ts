import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Value } from '../values/entities/value.entity';
import { ValueInstance } from '../value-instances/entities/value-instance.entity';
import { Channel } from '../channels/channel.entity';
import { Pipeline } from '../pipelines/entities/pipeline.entity';
import { Locale } from '../locales/locale.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoicesModule } from '../invoices/invoices.module';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Agent,
      Value,
      ValueInstance,
      Channel,
      Pipeline,
      Locale,
      Invoice,
    ]),
    InvoicesModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
