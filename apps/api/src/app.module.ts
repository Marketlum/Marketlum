import { Module } from '@nestjs/common';

import { ValueModule } from './value/value.module';
import { ValueStreamsModule } from './value_streams/value_streams.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import typeorm from './config/typeorm';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AgentsModule } from './agents/agents.module';
import { TaxonomiesModule } from './taxonomies/taxonomies.module';
import { ChannelsModule } from './channels/channels.module';
import { GeographiesModule } from './geographies/geographies.module';
import { AgreementsModule } from './agreements/agreements.module';
import { FilesModule } from './files/files.module';
import { LedgerModule } from './ledger/ledger.module';
import { LocalesModule } from './locales/locales.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { OfferingsModule } from './offerings/offerings.module';
import { ExchangesModule } from './exchanges/exchanges.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [typeorm]
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => (configService.get('typeorm') as TypeOrmModuleOptions)
    }),
    ValueModule,
    ValueStreamsModule,
    AgentsModule,
    TaxonomiesModule,
    ChannelsModule,
    GeographiesModule,
    AgreementsModule,
    FilesModule,
    LedgerModule,
    LocalesModule,
    UsersModule,
    AuthModule,
    DashboardModule,
    OfferingsModule,
    ExchangesModule,
    ChatModule,
  ],
})
export class AppModule { }