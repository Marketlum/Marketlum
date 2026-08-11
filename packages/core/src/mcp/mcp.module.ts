import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../roles/permissions.module';
import { SearchModule } from '../search/search.module';
import { ActorsModule } from '../actors/actors.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { OrdersModule } from '../orders/orders.module';
import { ValueStreamsModule } from '../value-streams/value-streams.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { McpController } from './mcp.controller';
import { McpGuard } from './mcp.guard';
import { McpToolRegistry } from './mcp-tool.registry';
import { McpServerFactory } from './mcp-server.factory';
import { AnyMcpTool, MCP_TOOLS } from './mcp-tool.interface';
import { SearchMarketTool } from './tools/search-market.tool';
import { SearchActorsTool } from './tools/search-actors.tool';
import { GetActorTool } from './tools/get-actor.tool';
import { GetActorFinancialsTool } from './tools/get-actor-financials.tool';
import { SearchInvoicesTool } from './tools/search-invoices.tool';
import { GetInvoiceTool } from './tools/get-invoice.tool';
import { SearchOrdersTool } from './tools/search-orders.tool';
import { GetOrderTool } from './tools/get-order.tool';
import { ListValueStreamsTool } from './tools/list-value-streams.tool';
import { GetDashboardSummaryTool } from './tools/get-dashboard-summary.tool';
import { GetExchangeRateTool } from './tools/get-exchange-rate.tool';
import { SearchValuesTool } from './tools/search-values.tool';
import { GetValueTool } from './tools/get-value.tool';
import { CreateValueTool } from './tools/create-value.tool';
import { UpdateValueTool } from './tools/update-value.tool';
import { SearchTensionsTool } from './tools/search-tensions.tool';
import { GetTensionTool } from './tools/get-tension.tool';
import { CreateTensionTool } from './tools/create-tension.tool';
import { UpdateTensionTool } from './tools/update-tension.tool';
import { SearchAgreementsTool } from './tools/search-agreements.tool';
import { GetAgreementTool } from './tools/get-agreement.tool';
import { CreateAgreementTool } from './tools/create-agreement.tool';
import { UpdateAgreementTool } from './tools/update-agreement.tool';
import { SearchOfferingsTool } from './tools/search-offerings.tool';
import { GetOfferingTool } from './tools/get-offering.tool';
import { CreateOfferingTool } from './tools/create-offering.tool';
import { UpdateOfferingTool } from './tools/update-offering.tool';
import { SearchTaxonomiesTool } from './tools/search-taxonomies.tool';
import { GetTaxonomyTool } from './tools/get-taxonomy.tool';
import { CreateTaxonomyTool } from './tools/create-taxonomy.tool';
import { UpdateTaxonomyTool } from './tools/update-taxonomy.tool';
import { ValuesModule } from '../values/values.module';
import { TensionsModule } from '../tensions/tensions.module';
import { AgreementsModule } from '../agreements/agreements.module';
import { OfferingsModule } from '../offerings/offerings.module';
import { TaxonomiesModule } from '../taxonomies/taxonomies.module';

// Registry order is also tools/list order — keep it in the MCP_TOOL_NAMES
// order from @marketlum/shared.
const TOOL_CLASSES = [
  SearchMarketTool,
  SearchActorsTool,
  GetActorTool,
  GetActorFinancialsTool,
  SearchInvoicesTool,
  GetInvoiceTool,
  SearchOrdersTool,
  GetOrderTool,
  ListValueStreamsTool,
  GetDashboardSummaryTool,
  GetExchangeRateTool,
  SearchValuesTool,
  GetValueTool,
  CreateValueTool,
  UpdateValueTool,
  SearchTensionsTool,
  GetTensionTool,
  CreateTensionTool,
  UpdateTensionTool,
  SearchAgreementsTool,
  GetAgreementTool,
  CreateAgreementTool,
  UpdateAgreementTool,
  SearchOfferingsTool,
  GetOfferingTool,
  CreateOfferingTool,
  UpdateOfferingTool,
  SearchTaxonomiesTool,
  GetTaxonomyTool,
  CreateTaxonomyTool,
  UpdateTaxonomyTool,
];

@Module({
  imports: [
    AuditModule,
    PermissionsModule,
    SearchModule,
    ActorsModule,
    InvoicesModule,
    OrdersModule,
    ValueStreamsModule,
    DashboardModule,
    ExchangeRatesModule,
    ValuesModule,
    TensionsModule,
    AgreementsModule,
    OfferingsModule,
    TaxonomiesModule,
  ],
  controllers: [McpController],
  providers: [
    ...TOOL_CLASSES,
    {
      provide: MCP_TOOLS,
      useFactory: (...tools: AnyMcpTool[]) => tools,
      inject: TOOL_CLASSES,
    },
    McpToolRegistry,
    McpServerFactory,
    McpGuard,
  ],
})
export class McpModule {}
