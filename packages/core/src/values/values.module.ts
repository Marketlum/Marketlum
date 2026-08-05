import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Value } from './entities/value.entity';
import { ValueImage } from './entities/value-image.entity';
import { Taxonomy } from '../taxonomies/entities/taxonomy.entity';
import { File } from '../files/entities/file.entity';
import { Actor } from '../actors/entities/actor.entity';
import { ValueStream } from '../value-streams/entities/value-stream.entity';
import { ValuesService } from './values.service';
import { ValuesController } from './values.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Value, ValueImage, Taxonomy, File, Actor, ValueStream])],
  controllers: [ValuesController],
  providers: [ValuesService],
  exports: [ValuesService],
})
export class ValuesModule {}
