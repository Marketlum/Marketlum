import { Injectable } from '@nestjs/common';
import { mcpUpdateTensionInputSchema, McpUpdateTensionInput } from '@marketlum/shared';
import { TensionsService } from '../../tensions/tensions.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class UpdateTensionTool implements McpTool<McpUpdateTensionInput> {
  readonly name = 'update_tension' as const;
  readonly description =
    'Update fields of an existing tension by `id` (name, context, potential future, score, ' +
    'actor). State transitions are not available over MCP. Returns the updated tension.';
  readonly permission = 'tensions:write';
  readonly inputSchema = mcpUpdateTensionInputSchema;

  constructor(private readonly tensionsService: TensionsService) {}

  execute(input: McpUpdateTensionInput): Promise<unknown> {
    const { id, ...rest } = input;
    return this.tensionsService.update(id, rest);
  }
}
