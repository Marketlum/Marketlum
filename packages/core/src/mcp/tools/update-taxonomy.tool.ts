import { Injectable } from '@nestjs/common';
import { mcpUpdateTaxonomyInputSchema, McpUpdateTaxonomyInput } from '@marketlum/shared';
import { TaxonomiesService } from '../../taxonomies/taxonomies.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class UpdateTaxonomyTool implements McpTool<McpUpdateTaxonomyInput> {
  readonly name = 'update_taxonomy' as const;
  readonly description =
    'Update fields of an existing taxonomy node by `id` (name, description, link). ' +
    'Re-parenting is not available over MCP. Returns the updated node.';
  readonly permission = 'taxonomies:write';
  readonly inputSchema = mcpUpdateTaxonomyInputSchema;

  constructor(private readonly taxonomiesService: TaxonomiesService) {}

  execute(input: McpUpdateTaxonomyInput): Promise<unknown> {
    const { id, ...rest } = input;
    return this.taxonomiesService.update(id, rest);
  }
}
