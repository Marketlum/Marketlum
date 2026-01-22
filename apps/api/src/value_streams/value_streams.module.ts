import { Module } from '@nestjs/common';
import { ValueStreamsService } from './value_streams.service';
import { ValueStreamsController } from './value_streams.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ValueStream } from './entities/value_stream.entity';
import { FileUpload } from '../files/entities/file-upload.entity';
import { Value } from '../value/entities/value.entity';
import { ValueInstance } from '../value-instances/entities/value-instance.entity';
import { Exchange } from '../exchanges/entities/exchange.entity';
import { Offering } from '../offerings/entities/offering.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ValueStream, FileUpload, Value, ValueInstance, Exchange, Offering])],
  controllers: [ValueStreamsController],
  providers: [ValueStreamsService],
})
export class ValueStreamsModule {}
