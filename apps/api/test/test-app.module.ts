import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MarketlumCoreModule } from '@marketlum/core';
import { nbpPlugin } from '@marketlum/plugin-nbp';
import { examplePlugin } from './plugins/example/example.plugin';

/**
 * The application module used by the e2e suite. Identical to the production
 * AppModule but registers the in-test "example" plugin so the plugin-system
 * mechanics features have something to exercise.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    MarketlumCoreModule.forRoot({ plugins: [examplePlugin, nbpPlugin] }),
  ],
})
export class TestAppModule {}
