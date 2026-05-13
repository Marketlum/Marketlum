import { Command, CommandRunner, Option } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { LocalesService } from '../locales/locales.service';
import { TaxonomiesService } from '../taxonomies/taxonomies.service';
import { GeographiesService } from '../geographies/geographies.service';
import { UsersService } from '../users/users.service';
import { AgentsService } from '../agents/agents.service';
import { ChannelsService } from '../channels/channels.service';
import { ArchetypesService } from '../archetypes/archetypes.service';
import { ValueStreamsService } from '../value-streams/value-streams.service';
import { AgreementTemplatesService } from '../agreement-templates/agreement-templates.service';
import { ValuesService } from '../values/values.service';
import { AgreementsService } from '../agreements/agreements.service';
import { PipelinesService } from '../pipelines/pipelines.service';
import { TensionsService } from '../tensions/tensions.service';
import { AccountsService } from '../ledger/accounts.service';
import { OfferingsService } from '../offerings/offerings.service';
import { InvoicesService } from '../invoices/invoices.service';
import { TransactionsService } from '../ledger/transactions.service';
import { ValueInstancesService } from '../value-instances/value-instances.service';
import { ExchangesService } from '../exchanges/exchanges.service';
import { ExchangeFlowsService } from '../exchanges/exchange-flows.service';

import { seedLocales } from './seeders/locale.seeder';
import { seedTaxonomies } from './seeders/taxonomy.seeder';
import { seedGeographies } from './seeders/geography.seeder';
import { seedUsers } from './seeders/user.seeder';
import { seedAgents } from './seeders/agent.seeder';
import { seedChannels } from './seeders/channel.seeder';
import { seedArchetypes } from './seeders/archetype.seeder';
import { seedValueStreams } from './seeders/value-stream.seeder';
import { seedAgreementTemplates } from './seeders/agreement-template.seeder';
import { seedValues } from './seeders/value.seeder';
import { seedAgreements } from './seeders/agreement.seeder';
import { seedPipelines } from './seeders/pipeline.seeder';
import { seedTensions } from './seeders/tension.seeder';
import { seedAccounts } from './seeders/account.seeder';
import { seedOfferings } from './seeders/offering.seeder';
import { seedInvoices } from './seeders/invoice.seeder';
import { seedTransactions } from './seeders/transaction.seeder';
import { seedValueInstances } from './seeders/value-instance.seeder';
import { seedExchanges } from './seeders/exchange.seeder';
import { seedRecurringFlows } from './seeders/recurring-flow.seeder';
import { RecurringFlowsService } from '../recurring-flows/recurring-flows.service';
import { seedExchangeRates } from './seeders/exchange-rate.seeder';
import { seedSystemSettings } from './seeders/system-settings.seeder';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';

@Command({
  name: 'seed:sample',
  description: 'Seed the database with realistic sample data',
})
export class SeedSampleCommand extends CommandRunner {
  private readonly logger = new Logger(SeedSampleCommand.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly localesService: LocalesService,
    private readonly taxonomiesService: TaxonomiesService,
    private readonly geographiesService: GeographiesService,
    private readonly usersService: UsersService,
    private readonly agentsService: AgentsService,
    private readonly channelsService: ChannelsService,
    private readonly archetypesService: ArchetypesService,
    private readonly valueStreamsService: ValueStreamsService,
    private readonly agreementTemplatesService: AgreementTemplatesService,
    private readonly valuesService: ValuesService,
    private readonly agreementsService: AgreementsService,
    private readonly pipelinesService: PipelinesService,
    private readonly tensionsService: TensionsService,
    private readonly accountsService: AccountsService,
    private readonly offeringsService: OfferingsService,
    private readonly invoicesService: InvoicesService,
    private readonly transactionsService: TransactionsService,
    private readonly valueInstancesService: ValueInstancesService,
    private readonly exchangesService: ExchangesService,
    private readonly exchangeFlowsService: ExchangeFlowsService,
    private readonly recurringFlowsService: RecurringFlowsService,
    private readonly exchangeRatesService: ExchangeRatesService,
    private readonly systemSettingsService: SystemSettingsService,
  ) {
    super();
  }

  @Option({
    flags: '--reset',
    description: 'Truncate all tables before seeding',
  })
  parseReset(): boolean {
    return true;
  }

  async run(_args: string[], options?: { reset?: boolean }): Promise<void> {
    faker.seed(42);

    if (options?.reset) {
      await this.resetDatabase();
    }

    await this.seedAll();
  }

  private async resetDatabase(): Promise<void> {
    this.logger.warn('Resetting database — truncating all tables...');

    const entities = this.dataSource.entityMetadatas;
    const tableNames = entities.map((e) => `"${e.tableName}"`).join(', ');
    await this.dataSource.query(`TRUNCATE TABLE ${tableNames} CASCADE`);

    this.logger.log('All tables truncated.');
  }

  private async seedAll(): Promise<void> {
    // Level 1: Root entities
    this.logger.log('Seeding locales...');
    const locales = await seedLocales(this.localesService);
    this.logger.log(`  Created ${locales.length} locales`);

    this.logger.log('Seeding taxonomies...');
    const taxonomies = await seedTaxonomies(this.taxonomiesService);
    this.logger.log(`  Created ${taxonomies.all.length} taxonomies`);

    this.logger.log('Seeding geographies...');
    const geographies = await seedGeographies(this.geographiesService);
    this.logger.log(`  Created ${geographies.all.length} geographies`);

    // Level 2: Users
    this.logger.log('Seeding users...');
    const users = await seedUsers(this.usersService);
    this.logger.log(`  Created ${users.length} users`);

    // Level 3: Agents, Channels
    this.logger.log('Seeding agents...');
    const agents = await seedAgents(this.agentsService, { taxonomies });
    this.logger.log(`  Created ${agents.length} agents`);

    this.logger.log('Seeding channels...');
    const channels = await seedChannels(this.channelsService, { agents });
    this.logger.log(`  Created ${channels.all.length} channels`);

    // Level 4: Archetypes, Value Streams, Agreement Templates
    this.logger.log('Seeding archetypes...');
    const archetypes = await seedArchetypes(this.archetypesService, { taxonomies });
    this.logger.log(`  Created ${archetypes.length} archetypes`);

    this.logger.log('Seeding value streams...');
    const valueStreams = await seedValueStreams(this.valueStreamsService, { users });
    this.logger.log(`  Created ${valueStreams.all.length} value streams`);

    this.logger.log('Seeding agreement templates...');
    const agreementTemplates = await seedAgreementTemplates(this.agreementTemplatesService);
    this.logger.log(`  Created ${agreementTemplates.length} agreement templates`);

    // Level 5: Values, Agreements
    this.logger.log('Seeding values...');
    const values = await seedValues(this.valuesService, { taxonomies, agents, valueStreams });
    this.logger.log(`  Created ${values.length} values`);

    this.logger.log('Seeding agreements...');
    const agreements = await seedAgreements(this.agreementsService, {
      agents,
      agreementTemplates,
      valueStreams: valueStreams.all,
    });
    this.logger.log(`  Created ${agreements.length} agreements`);

    // Level 6: Pipelines, Tensions, Accounts, Offerings, Invoices
    this.logger.log('Seeding pipelines...');
    const pipelines = await seedPipelines(this.pipelinesService, { valueStreams });
    this.logger.log(`  Created ${pipelines.length} pipelines`);

    this.logger.log('Seeding tensions...');
    const tensions = await seedTensions(this.tensionsService, { agents, users });
    this.logger.log(`  Created ${tensions.length} tensions`);

    this.logger.log('Seeding accounts...');
    const accounts = await seedAccounts(this.accountsService, { values, agents });
    this.logger.log(`  Created ${accounts.length} accounts`);

    this.logger.log('Seeding offerings...');
    const offerings = await seedOfferings(this.offeringsService, { values, agents, valueStreams });
    this.logger.log(`  Created ${offerings.length} offerings`);

    // Seed exchange rates and base value BEFORE invoices and recurring flows so
    // those entities can resolve a baseAmount snapshot at write time.
    this.logger.log('Seeding exchange rates...');
    const rates = await seedExchangeRates(this.exchangeRatesService, { values });
    this.logger.log(`  Created ${rates.length} exchange rates`);

    this.logger.log('Setting system base value...');
    const baseSetting = await seedSystemSettings(this.systemSettingsService, { values });
    this.logger.log(`  Base value set to ${baseSetting?.baseValueId ?? '(not found)'}`);

    this.logger.log('Seeding invoices...');
    const invoices = await seedInvoices(this.invoicesService, { agents, values, valueStreams });
    this.logger.log(`  Created ${invoices.length} invoices`);

    // Level 7: Transactions, Value Instances, Exchanges
    this.logger.log('Seeding transactions...');
    const transactions = await seedTransactions(this.transactionsService, { accounts });
    this.logger.log(`  Created ${transactions.length} transactions`);

    this.logger.log('Seeding value instances...');
    const valueInstances = await seedValueInstances(this.valueInstancesService, { values, agents });
    this.logger.log(`  Created ${valueInstances.length} value instances`);

    this.logger.log('Seeding exchanges...');
    const exchanges = await seedExchanges(this.exchangesService, this.exchangeFlowsService, {
      agents,
      values,
      valueStreams,
      channels,
      pipelines,
      users,
      tensions,
    });
    this.logger.log(`  Created ${exchanges.length} exchanges`);

    this.logger.log('Seeding recurring flows...');
    const recurringFlows = await seedRecurringFlows(this.recurringFlowsService, {
      valueStreams: valueStreams.all,
      agents,
      values,
    });
    this.logger.log(`  Created ${recurringFlows.length} recurring flows`);

    this.logger.log('Sample data seeded successfully!');
  }
}
