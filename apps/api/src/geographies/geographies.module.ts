import { Module } from '@nestjs/common';
import { GeographiesService } from './geographies.service';
import { GeographiesController } from './geographies.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Geography } from './entities/geography.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Geography])],
  controllers: [GeographiesController],
  providers: [GeographiesService],
})
export class GeographiesModule {}
