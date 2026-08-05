import { Injectable } from '@nestjs/common';
import { mcpSearchOrdersInputSchema, McpSearchOrdersInput } from '@marketlum/shared';
import { OrdersService } from '../../orders/orders.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class SearchOrdersTool implements McpTool<McpSearchOrdersInput> {
  readonly name = 'search_orders' as const;
  readonly description =
    'Search orders with pagination and optional filters: lifecycle state, counterparty agents ' +
    '(fromAgentId / toAgentId or agentId for either side), channel, pipeline and currency. ' +
    'Use this to find orders or inspect the order pipeline. Returns a paginated envelope ' +
    '{ data, meta: { page, limit, total, totalPages } }.';
  readonly permission = 'orders:read';
  readonly inputSchema = mcpSearchOrdersInputSchema;

  constructor(private readonly ordersService: OrdersService) {}

  execute(input: McpSearchOrdersInput): Promise<unknown> {
    return this.ordersService.search(input);
  }
}
