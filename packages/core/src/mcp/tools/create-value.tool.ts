import { Injectable } from '@nestjs/common';
import { mcpCreateValueInputSchema, McpCreateValueInput } from '@marketlum/shared';
import { ValuesService } from '../../values/values.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class CreateValueTool implements McpTool<McpCreateValueInput> {
  readonly name = 'create_value' as const;
  readonly description =
    'Create a new value. Requires a snake_case `code`, a `name` and a `type` (e.g. product, ' +
    'service, currency). Returns the created value. Use update_value to change it later.';
  readonly permission = 'values:write';
  readonly inputSchema = mcpCreateValueInputSchema;

  constructor(private readonly valuesService: ValuesService) {}

  execute(input: McpCreateValueInput): Promise<unknown> {
    return this.valuesService.create(input);
  }
}
