import { Injectable } from '@nestjs/common';
import { mcpGetValueInputSchema, McpGetValueInput } from '@marketlum/shared';
import { ValuesService } from '../../values/values.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class GetValueTool implements McpTool<McpGetValueInput> {
  readonly name = 'get_value' as const;
  readonly description =
    'Fetch one value by id with its full detail (type, purpose, hierarchy, taxonomies, owner ' +
    'actor). Use after search_values or search_market when you have the id.';
  readonly permission = 'values:read';
  readonly inputSchema = mcpGetValueInputSchema;

  constructor(private readonly valuesService: ValuesService) {}

  execute(input: McpGetValueInput): Promise<unknown> {
    return this.valuesService.findOne(input.id);
  }
}
