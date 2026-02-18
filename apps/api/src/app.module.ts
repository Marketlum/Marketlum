import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { databaseConfig } from './config/database.config';
import { CsrfProtectionGuard } from './common/guards/csrf-protection.guard';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AgentsModule } from './agents/agents.module';
import { TaxonomiesModule } from './taxonomies/taxonomies.module';
import { FilesModule } from './files/files.module';
import { ValuesModule } from './values/values.module';
import { ValueInstancesModule } from './value-instances/value-instances.module';
import { PerspectivesModule } from './perspectives/perspectives.module';
import { ValueStreamsModule } from './value-streams/value-streams.module';
import { SearchModule } from './search/search.module';
import { LedgerModule } from './ledger/ledger.module';
import { AgreementsModule } from './agreements/agreements.module';
import { ChannelsModule } from './channels/channels.module';
import { OfferingsModule } from './offerings/offerings.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ExchangesModule } from './exchanges/exchanges.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { GeographiesModule } from './geographies/geographies.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    TypeOrmModule.forRoot(databaseConfig()),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 100 }]),
    AuthModule,
    UsersModule,
    AgentsModule,
    TaxonomiesModule,
    FilesModule,
    ValuesModule,
    ValueInstancesModule,
    PerspectivesModule,
    ValueStreamsModule,
    SearchModule,
    LedgerModule,
    AgreementsModule,
    ChannelsModule,
    OfferingsModule,
    InvoicesModule,
    ExchangesModule,
    DashboardModule,
    GeographiesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CsrfProtectionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
