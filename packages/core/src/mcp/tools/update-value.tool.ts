import { Injectable } from '@nestjs/common';
import { mcpUpdateValueInputSchema, McpUpdateValueInput } from '@marketlum/shared';
import { ValuesService } from '../../values/values.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class UpdateValueTool implements McpTool<McpUpdateValueInput> {
  readonly name = 'update_value' as const;
  readonly description =
    'Update fields of an existing value by `id` (name, purpose, description, links, ' +
    'hierarchy, taxonomies). Only provided fields change. Returns the updated value.';
  readonly permission = 'values:write';
  readonly inputSchema = mcpUpdateValueInputSchema;

  constructor(private readonly valuesService: ValuesService) {}

  execute(input: McpUpdateValueInput): Promise<unknown> {
    const { id, ...rest } = input;
    return this.valuesService.update(id, rest);
  }
}
