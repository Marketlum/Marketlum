import { Injectable } from '@nestjs/common';
import { mcpGetOrderInputSchema, McpGetOrderInput } from '@marketlum/shared';
import { OrdersService } from '../../orders/orders.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class GetOrderTool implements McpTool<McpGetOrderInput> {
  readonly name = 'get_order' as const;
  readonly description =
    'Fetch one order by id, including its items, lifecycle state, counterparty agents and any linked ' +
    'invoice. Use this when you have an order id (e.g. from search_orders) and need the full record.';
  readonly permission = 'orders:read';
  readonly inputSchema = mcpGetOrderInputSchema;

  constructor(private readonly ordersService: OrdersService) {}

  execute(input: McpGetOrderInput): Promise<unknown> {
    return this.ordersService.findOne(input.id);
  }
}
