import { Injectable } from '@nestjs/common';
import { mcpCreateTaxonomyInputSchema, McpCreateTaxonomyInput } from '@marketlum/shared';
import { TaxonomiesService } from '../../taxonomies/taxonomies.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class CreateTaxonomyTool implements McpTool<McpCreateTaxonomyInput> {
  readonly name = 'create_taxonomy' as const;
  readonly description =
    'Create a new taxonomy node. Requires a snake_case `code` and a `name`; pass `parentId` ' +
    'to place it under an existing node, omit it for a root.';
  readonly permission = 'taxonomies:write';
  readonly inputSchema = mcpCreateTaxonomyInputSchema;

  constructor(private readonly taxonomiesService: TaxonomiesService) {}

  execute(input: McpCreateTaxonomyInput): Promise<unknown> {
    return this.taxonomiesService.create(input);
  }
}
