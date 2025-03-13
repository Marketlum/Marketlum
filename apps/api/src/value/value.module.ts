import { Module } from '@nestjs/common';
import { ValueService } from './value.service';
import { ValueController } from './value.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Value } from './entities/value.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Value])],
  controllers: [ValueController],
  providers: [ValueService],
})
export class ValueModule {}
