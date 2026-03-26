import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ValueInstance } from './entities/value-instance.entity';
import { Value } from '../values/entities/value.entity';
import { Agent } from '../agents/entities/agent.entity';
import { File } from '../files/entities/file.entity';
import { ValueInstancesService } from './value-instances.service';
import { ValueInstancesController } from './value-instances.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ValueInstance, Value, Agent, File])],
  controllers: [ValueInstancesController],
  providers: [ValueInstancesService],
  exports: [ValueInstancesService],
})
export class ValueInstancesModule {}
