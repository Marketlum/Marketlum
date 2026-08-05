import { Injectable } from '@nestjs/common';
import { mcpGetInvoiceInputSchema, McpGetInvoiceInput } from '@marketlum/shared';
import { InvoicesService } from '../../invoices/invoices.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class GetInvoiceTool implements McpTool<McpGetInvoiceInput> {
  readonly name = 'get_invoice' as const;
  readonly description =
    'Fetch one invoice by id, including its line items, counterparty actors, currency and payment ' +
    'status. Use this when you have an invoice id (e.g. from search_invoices) and need the full ' +
    'document. Monetary amounts are decimal strings.';
  readonly permission = 'invoices:read';
  readonly inputSchema = mcpGetInvoiceInputSchema;

  constructor(private readonly invoicesService: InvoicesService) {}

  execute(input: McpGetInvoiceInput): Promise<unknown> {
    return this.invoicesService.findOne(input.id);
  }
}
