import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Perspective } from './entities/perspective.entity';
import { PerspectivesService } from './perspectives.service';
import { PerspectivesController } from './perspectives.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Perspective])],
  controllers: [PerspectivesController],
  providers: [PerspectivesService],
})
export class PerspectivesModule {}
