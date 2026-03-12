import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Archetype } from './entities/archetype.entity';
import { Taxonomy } from '../taxonomies/entities/taxonomy.entity';
import { ArchetypesService } from './archetypes.service';
import { ArchetypesController } from './archetypes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Archetype, Taxonomy])],
  controllers: [ArchetypesController],
  providers: [ArchetypesService],
})
export class ArchetypesModule {}
