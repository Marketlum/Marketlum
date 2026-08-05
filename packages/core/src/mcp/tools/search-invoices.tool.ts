import { Injectable } from '@nestjs/common';
import { mcpSearchInvoicesInputSchema, McpSearchInvoicesInput } from '@marketlum/shared';
import { InvoicesService } from '../../invoices/invoices.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class SearchInvoicesTool implements McpTool<McpSearchInvoicesInput> {
  readonly name = 'search_invoices' as const;
  readonly description =
    'Search invoices with pagination and optional filters: counterparty agents (fromAgentId / toAgentId ' +
    'or agentId for either side), channel, currency, linked order, market and paid status. ' +
    'Use this to find invoices or to answer questions about invoicing volume between agents. ' +
    'Returns a paginated envelope { data, meta: { page, limit, total, totalPages } }; amounts are decimal strings.';
  readonly permission = 'invoices:read';
  readonly inputSchema = mcpSearchInvoicesInputSchema;

  constructor(private readonly invoicesService: InvoicesService) {}

  execute(input: McpSearchInvoicesInput): Promise<unknown> {
    const { paid, ...rest } = input;
    return this.invoicesService.search({
      ...rest,
      paid: paid === undefined ? undefined : String(paid),
    });
  }
}
