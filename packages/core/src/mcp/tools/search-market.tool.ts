import { Injectable } from '@nestjs/common';
import { mcpSearchMarketInputSchema, McpSearchMarketInput } from '@marketlum/shared';
import { SearchService } from '../../search/search.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class SearchMarketTool implements McpTool<McpSearchMarketInput> {
  readonly name = 'search_market' as const;
  readonly description =
    'Full-text search across the whole market: agents, users, values, value instances, value streams and tensions. ' +
    'Use this first when you have a name or keyword and do not yet know which entity it belongs to. ' +
    'Returns ranked matches with each entity type and id, which you can pass to the get_* tools.';
  readonly permission = 'search:read';
  readonly inputSchema = mcpSearchMarketInputSchema;

  constructor(private readonly searchService: SearchService) {}

  execute(input: McpSearchMarketInput): Promise<unknown> {
    return this.searchService.search(input);
  }
}
