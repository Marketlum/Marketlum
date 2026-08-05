import { Module } from '@nestjs/common';
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
];

@Module({
  imports: [
    PermissionsModule,
    SearchModule,
    ActorsModule,
    InvoicesModule,
    OrdersModule,
    ValueStreamsModule,
    DashboardModule,
    ExchangeRatesModule,
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
