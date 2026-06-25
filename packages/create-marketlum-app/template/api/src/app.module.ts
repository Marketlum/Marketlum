import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MarketlumCoreModule } from '@marketlum/core';
import { plugins } from './plugins';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),
    MarketlumCoreModule.forRoot({ plugins }),
  ],
})
export class AppModule {}
