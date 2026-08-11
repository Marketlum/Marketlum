import { Injectable } from '@nestjs/common';
import { mcpSearchOfferingsInputSchema, McpSearchOfferingsInput } from '@marketlum/shared';
import { OfferingsService } from '../../offerings/offerings.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class SearchOfferingsTool implements McpTool<McpSearchOfferingsInput> {
  readonly name = 'search_offerings' as const;
  readonly description =
    'List offerings (purchasable bundles of values) with pagination, `search` text and an ' +
    'optional `state` filter. Returns a paginated envelope { data, meta }.';
  readonly permission = 'offerings:read';
  readonly inputSchema = mcpSearchOfferingsInputSchema;

  constructor(private readonly offeringsService: OfferingsService) {}

  execute(input: McpSearchOfferingsInput): Promise<unknown> {
    return this.offeringsService.search(input);
  }
}
