import { Module } from '@nestjs/common';
import { ValueStreamsService } from './value_streams.service';
import { ValueStreamsController } from './value_streams.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ValueStream } from './entities/value_stream.entity';
import { FileUpload } from '../files/entities/file-upload.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ValueStream, FileUpload])],
  controllers: [ValueStreamsController],
  providers: [ValueStreamsService],
})
export class ValueStreamsModule {}
