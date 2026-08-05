import { Injectable } from '@nestjs/common';
import { mcpGetExchangeRateInputSchema, McpGetExchangeRateInput } from '@marketlum/shared';
import { ExchangeRatesService } from '../../exchange-rates/exchange-rates.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class GetExchangeRateTool implements McpTool<McpGetExchangeRateInput> {
  readonly name = 'get_exchange_rate' as const;
  readonly description =
    'Look up the exchange rate active between two currency values at a point in time ' +
    '(`at` defaults to now, ISO datetime). Use this to convert amounts between the currencies ' +
    'used on invoices and orders. Returns { rate, sourceRowId, effectiveAt, fromValueId, toValueId } ' +
    'or null when no rate is recorded for the pair.';
  readonly permission = 'exchange-rates:read';
  readonly inputSchema = mcpGetExchangeRateInputSchema;

  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  async execute(input: McpGetExchangeRateInput): Promise<unknown> {
    const at = input.at ? new Date(input.at) : new Date();
    const result = await this.exchangeRatesService.lookup(input.fromValueId, input.toValueId, at);
    // Mirror the REST lookup response shape exactly, including explicit null.
    if (!result) return null;
    return {
      rate: result.rate,
      sourceRowId: result.sourceRowId,
      effectiveAt: result.effectiveAt.toISOString(),
      fromValueId: result.fromValueId,
      toValueId: result.toValueId,
    };
  }
}
