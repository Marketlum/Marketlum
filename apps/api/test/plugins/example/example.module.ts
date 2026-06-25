import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Widget } from './widget.entity';
import { ExampleController } from './example.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Widget])],
  controllers: [ExampleController],
})
export class ExampleModule {}
