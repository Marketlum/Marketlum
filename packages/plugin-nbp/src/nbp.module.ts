import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExchangeRate, Value } from '@marketlum/core';
import { NbpController } from './nbp.controller';
import { NbpService } from './nbp.service';
import { NbpClient } from './nbp.client';

@Module({
  imports: [TypeOrmModule.forFeature([ExchangeRate, Value])],
  controllers: [NbpController],
  providers: [NbpService, NbpClient],
  exports: [NbpService],
})
export class NbpModule {}
