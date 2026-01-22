import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ValueInstancesController } from './value-instances.controller';
import { ValueInstancesService } from './value-instances.service';
import { ValueInstance } from './entities/value-instance.entity';
import { Value } from '../value/entities/value.entity';
import { Agent } from '../agents/entities/agent.entity';
import { FileUpload } from '../files/entities/file-upload.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ValueInstance, Value, Agent, FileUpload]),
  ],
  controllers: [ValueInstancesController],
  providers: [ValueInstancesService],
  exports: [ValueInstancesService],
})
export class ValueInstancesModule {}
