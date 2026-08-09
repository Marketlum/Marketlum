import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { File } from '../files/entities/file.entity';
import { Role } from '../roles/entities/role.entity';
import { Actor } from '../actors/entities/actor.entity';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, File, Role, Actor]), ApiKeysModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
