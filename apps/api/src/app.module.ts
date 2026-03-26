import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MarketlumCoreModule } from '@marketlum/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    MarketlumCoreModule,
  ],
})
export class AppModule {}
