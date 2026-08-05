import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Value } from '../values/entities/value.entity';
import { ValueInstance } from '../value-instances/entities/value-instance.entity';
import { Actor } from '../actors/entities/actor.entity';
import { User } from '../users/entities/user.entity';
import { ValueStream } from '../value-streams/entities/value-stream.entity';
import { Tension } from '../tensions/entities/tension.entity';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Value, ValueInstance, Actor, User, ValueStream, Tension])],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
