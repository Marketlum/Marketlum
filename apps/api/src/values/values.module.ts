import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Value } from './entities/value.entity';
import { Taxonomy } from '../taxonomies/entities/taxonomy.entity';
import { File } from '../files/entities/file.entity';
import { Agent } from '../agents/entities/agent.entity';
import { ValuesService } from './values.service';
import { ValuesController } from './values.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Value, Taxonomy, File, Agent])],
  controllers: [ValuesController],
  providers: [ValuesService],
})
export class ValuesModule {}
