import { Injectable } from '@nestjs/common';
import { mcpGetTensionInputSchema, McpGetTensionInput } from '@marketlum/shared';
import { TensionsService } from '../../tensions/tensions.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class GetTensionTool implements McpTool<McpGetTensionInput> {
  readonly name = 'get_tension' as const;
  readonly description =
    'Fetch one tension by id with its context, potential future, score, state and owning ' +
    'actor. Use after search_tensions when you have the id.';
  readonly permission = 'tensions:read';
  readonly inputSchema = mcpGetTensionInputSchema;

  constructor(private readonly tensionsService: TensionsService) {}

  execute(input: McpGetTensionInput): Promise<unknown> {
    return this.tensionsService.findOne(input.id);
  }
}
