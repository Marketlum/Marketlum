import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfferingsService } from './offerings.service';
import { OfferingsController } from './offerings.controller';
import { Offering } from './entities/offering.entity';
import { OfferingItem } from './entities/offering-item.entity';
import { Agent } from '../agents/entities/agent.entity';
import { ValueStream } from '../value_streams/entities/value_stream.entity';
import { Value } from '../value/entities/value.entity';
import { FileUpload } from '../files/entities/file-upload.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Offering,
      OfferingItem,
      Agent,
      ValueStream,
      Value,
      FileUpload,
    ]),
  ],
  controllers: [OfferingsController],
  providers: [OfferingsService],
  exports: [OfferingsService],
})
export class OfferingsModule {}
