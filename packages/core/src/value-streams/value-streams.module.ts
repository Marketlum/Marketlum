import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ValueStream } from './entities/value-stream.entity';
import { User } from '../users/entities/user.entity';
import { File } from '../files/entities/file.entity';
import { ValueStreamsService } from './value-streams.service';
import { ValueStreamsController } from './value-streams.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ValueStream, User, File])],
  controllers: [ValueStreamsController],
  providers: [ValueStreamsService],
  exports: [ValueStreamsService],
})
export class ValueStreamsModule {}
