import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Geography } from './geography.entity';
import { GeographiesService } from './geographies.service';
import { GeographiesController } from './geographies.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Geography])],
  controllers: [GeographiesController],
  providers: [GeographiesService],
  exports: [GeographiesService],
})
export class GeographiesModule {}
