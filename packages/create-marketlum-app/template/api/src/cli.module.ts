import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MarketlumCoreModule, SeedSampleCommand } from '@marketlum/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),
    MarketlumCoreModule,
  ],
  providers: [SeedSampleCommand],
})
export class CliModule {}
