import { Module } from '@nestjs/common';
import { ValueService } from './value.service';
import { ValueController } from './value.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Value } from './entities/value.entity';
import { ValueStream } from 'src/value_streams/entities/value_stream.entity';
import { Agent } from 'src/agents/entities/agent.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Value, ValueStream, Agent])],
  controllers: [ValueController],
  providers: [ValueService],
})
export class ValueModule {}
