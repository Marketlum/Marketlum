import { Injectable } from '@nestjs/common';
import { mcpGetDashboardSummaryInputSchema, McpGetDashboardSummaryInput } from '@marketlum/shared';
import { DashboardService } from '../../dashboard/dashboard.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class GetDashboardSummaryTool implements McpTool<McpGetDashboardSummaryInput> {
  readonly name = 'get_dashboard_summary' as const;
  readonly description =
    'Market-wide financial summary in the presentation currency: total revenue, total expenses, ' +
    'invoice count and a revenue/expense time series, optionally scoped by agent, channel or a ' +
    'fromDate/toDate range (ISO dates). Use this for "how is the market doing" overview questions ' +
    'before drilling into specific agents or invoices. Amounts are decimal strings; ' +
    'notConvertedCount reports invoices that could not be converted for lack of an exchange rate.';
  readonly permission = 'dashboard:read';
  readonly inputSchema = mcpGetDashboardSummaryInputSchema;

  constructor(private readonly dashboardService: DashboardService) {}

  execute(input: McpGetDashboardSummaryInput): Promise<unknown> {
    return this.dashboardService.getSummary(input);
  }
}
