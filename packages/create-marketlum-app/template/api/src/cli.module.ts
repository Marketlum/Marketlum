import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MarketlumCoreModule, SeedAdminCommand, SeedSampleCommand } from '@marketlum/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),
    MarketlumCoreModule,
  ],
  providers: [SeedAdminCommand, SeedSampleCommand],
})
export class CliModule {}
