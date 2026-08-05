import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offering } from './entities/offering.entity';
import { OfferingComponent } from './entities/offering-component.entity';
import { Actor } from '../actors/entities/actor.entity';
import { ValueStream } from '../value-streams/entities/value-stream.entity';
import { Value } from '../values/entities/value.entity';
import { OfferingsService } from './offerings.service';
import { OfferingsController } from './offerings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Offering, OfferingComponent, Actor, ValueStream, Value]),
  ],
  controllers: [OfferingsController],
  providers: [OfferingsService],
  exports: [OfferingsService],
})
export class OfferingsModule {}
