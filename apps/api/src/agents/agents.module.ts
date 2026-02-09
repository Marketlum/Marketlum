import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from './entities/agent.entity';
import { Taxonomy } from '../taxonomies/entities/taxonomy.entity';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Agent, Taxonomy])],
  controllers: [AgentsController],
  providers: [AgentsService],
})
export class AgentsModule {}
