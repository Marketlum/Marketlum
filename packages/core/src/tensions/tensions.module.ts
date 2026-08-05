import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tension } from './entities/tension.entity';
import { Actor } from '../actors/entities/actor.entity';
import { User } from '../users/entities/user.entity';
import { TensionsService } from './tensions.service';
import { TensionsController } from './tensions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tension, Actor, User])],
  controllers: [TensionsController],
  providers: [TensionsService],
  exports: [TensionsService],
})
export class TensionsModule {}
