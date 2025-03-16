import { Module } from '@nestjs/common';
import { ValueStreamsService } from './value_streams.service';
import { ValueStreamsController } from './value_streams.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ValueStream } from './entities/value_stream.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ValueStream])],
  controllers: [ValueStreamsController],
  providers: [ValueStreamsService],
})
export class ValueStreamsModule {}
