import { Injectable } from '@nestjs/common';
import { mcpGetTaxonomyInputSchema, McpGetTaxonomyInput } from '@marketlum/shared';
import { TaxonomiesService } from '../../taxonomies/taxonomies.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class GetTaxonomyTool implements McpTool<McpGetTaxonomyInput> {
  readonly name = 'get_taxonomy' as const;
  readonly description =
    'Fetch one taxonomy node by id with its code, name and description. Use after ' +
    'search_taxonomies when you have the id.';
  readonly permission = 'taxonomies:read';
  readonly inputSchema = mcpGetTaxonomyInputSchema;

  constructor(private readonly taxonomiesService: TaxonomiesService) {}

  execute(input: McpGetTaxonomyInput): Promise<unknown> {
    return this.taxonomiesService.findOne(input.id);
  }
}
