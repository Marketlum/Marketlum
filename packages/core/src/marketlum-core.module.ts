import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
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
import { PipelinesModule } from './pipelines/pipelines.module';
import { TensionsModule } from './tensions/tensions.module';
import { ExchangesModule } from './exchanges/exchanges.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { GeographiesModule } from './geographies/geographies.module';
import { ArchetypesModule } from './archetypes/archetypes.module';
import { LocalesModule } from './locales/locales.module';
import { AgreementTemplatesModule } from './agreement-templates/agreement-templates.module';
import { RecurringFlowsModule } from './recurring-flows/recurring-flows.module';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';
import { SystemSettingsModule } from './system-settings/system-settings.module';
import { AiModule } from './ai/ai.module';
import { GeocodingModule } from './geocoding/geocoding.module';

@Module({
  imports: [
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
    PipelinesModule,
    TensionsModule,
    ExchangesModule,
    DashboardModule,
    GeographiesModule,
    ArchetypesModule,
    LocalesModule,
    AgreementTemplatesModule,
    RecurringFlowsModule,
    ExchangeRatesModule,
    SystemSettingsModule,
    AiModule,
    GeocodingModule,
  ],
  exports: [
    AuthModule,
    UsersModule,
    AgentsModule,
    TaxonomiesModule,
    FilesModule,
    ValuesModule,
    ValueInstancesModule,
    ValueStreamsModule,
    LedgerModule,
    AgreementsModule,
    ChannelsModule,
    OfferingsModule,
    InvoicesModule,
    PipelinesModule,
    TensionsModule,
    ExchangesModule,
    GeographiesModule,
    ArchetypesModule,
    LocalesModule,
    AgreementTemplatesModule,
    RecurringFlowsModule,
    ExchangeRatesModule,
    SystemSettingsModule,
    AiModule,
    GeocodingModule,
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
export class MarketlumCoreModule {}
