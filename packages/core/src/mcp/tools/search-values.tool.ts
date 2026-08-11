import { Injectable } from '@nestjs/common';
import { mcpSearchValuesInputSchema, McpSearchValuesInput } from '@marketlum/shared';
import { ValuesService } from '../../values/values.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class SearchValuesTool implements McpTool<McpSearchValuesInput> {
  readonly name = 'search_values' as const;
  readonly description =
    'List the market\'s values (products, services, rights, relationships) with pagination, ' +
    'optional `type` filter and `search` text. Use this to find a value id before fetching or ' +
    'updating it. Returns a paginated envelope { data, meta }.';
  readonly permission = 'values:read';
  readonly inputSchema = mcpSearchValuesInputSchema;

  constructor(private readonly valuesService: ValuesService) {}

  execute(input: McpSearchValuesInput): Promise<unknown> {
    return this.valuesService.findAll(input);
  }
}
