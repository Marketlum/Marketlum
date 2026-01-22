import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Agent } from '../agents/entities/agent.entity';
import { FileUpload } from '../files/entities/file-upload.entity';
import { Value } from '../value/entities/value.entity';
import { ValueInstance } from '../value-instances/entities/value-instance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceItem,
      Agent,
      FileUpload,
      Value,
      ValueInstance,
    ]),
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
