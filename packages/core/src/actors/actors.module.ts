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
import { Tension } from '../tensions/entities/tension.entity';
import { TensionsModule } from '../tensions/tensions.module';

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
      Tension,
    ]),
    GeocodingModule,
    // Deleting an actor must discard its tensions through the command path
    // rather than a database cascade (spec 027 Q7).
    TensionsModule,
  ],
  controllers: [ActorsController],
  providers: [ActorsService, AddressesService],
  exports: [ActorsService, AddressesService],
})
export class ActorsModule {}
