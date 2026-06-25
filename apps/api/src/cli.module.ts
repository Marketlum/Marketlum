import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MarketlumCoreModule, SeedAdminCommand, SeedSampleCommand } from '@marketlum/core';
import { plugins } from './plugins';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    MarketlumCoreModule.forRoot({ plugins }),
  ],
  providers: [SeedAdminCommand, SeedSampleCommand],
})
export class CliModule {}
