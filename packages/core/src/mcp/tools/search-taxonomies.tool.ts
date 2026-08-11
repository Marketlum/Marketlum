import { Injectable } from '@nestjs/common';
import { mcpSearchTaxonomiesInputSchema, McpSearchTaxonomiesInput } from '@marketlum/shared';
import { TaxonomiesService } from '../../taxonomies/taxonomies.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class SearchTaxonomiesTool implements McpTool<McpSearchTaxonomiesInput> {
  readonly name = 'search_taxonomies' as const;
  readonly description =
    'List taxonomy nodes (classification categories) with pagination and `search` text. ' +
    'Returns a paginated envelope { data, meta }.';
  readonly permission = 'taxonomies:read';
  readonly inputSchema = mcpSearchTaxonomiesInputSchema;

  constructor(private readonly taxonomiesService: TaxonomiesService) {}

  execute(input: McpSearchTaxonomiesInput): Promise<unknown> {
    return this.taxonomiesService.search(input);
  }
}
