import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Actor } from './entities/actor.entity';
import { Address } from './addresses/entities/address.entity';
import { Taxonomy } from '../taxonomies/entities/taxonomy.entity';
import { File } from '../files/entities/file.entity';
import { Geography } from '../geographies/geography.entity';
import { Value } from '../values/entities/value.entity';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';
import { ActorsService } from './actors.service';
import { AddressesService } from './addresses/addresses.service';
import { ActorsController } from './actors.controller';
import { GeocodingModule } from '../geocoding/geocoding.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Actor,
      Address,
      Taxonomy,
      File,
      Geography,
      Value,
      InvoiceItem,
    ]),
    GeocodingModule,
  ],
  controllers: [ActorsController],
  providers: [ActorsService, AddressesService],
  exports: [ActorsService, AddressesService],
})
export class ActorsModule {}
