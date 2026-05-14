import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from './entities/agent.entity';
import { Address } from './addresses/entities/address.entity';
import { Taxonomy } from '../taxonomies/entities/taxonomy.entity';
import { File } from '../files/entities/file.entity';
import { Geography } from '../geographies/geography.entity';
import { AgentsService } from './agents.service';
import { AddressesService } from './addresses/addresses.service';
import { AgentsController } from './agents.controller';
import { GeocodingModule } from '../geocoding/geocoding.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, Address, Taxonomy, File, Geography]),
    GeocodingModule,
  ],
  controllers: [AgentsController],
  providers: [AgentsService, AddressesService],
  exports: [AgentsService, AddressesService],
})
export class AgentsModule {}
