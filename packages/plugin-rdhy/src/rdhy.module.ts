import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ValueStream } from '@marketlum/core';
import { RdhyPlatform } from './platforms/rdhy-platform.entity';
import { RdhyPlatformValueStream } from './platforms/rdhy-platform-value-stream.entity';
import { PlatformsController } from './platforms/platforms.controller';
import { AssignmentsController } from './platforms/assignments.controller';
import { PlatformsService } from './platforms/platforms.service';

@Module({
  imports: [TypeOrmModule.forFeature([RdhyPlatform, RdhyPlatformValueStream, ValueStream])],
  controllers: [PlatformsController, AssignmentsController],
  providers: [PlatformsService],
  exports: [PlatformsService],
})
export class RdhyModule {}
