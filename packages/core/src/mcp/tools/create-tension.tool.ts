import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { mcpCreateTensionInputSchema, McpCreateTensionInput } from '@marketlum/shared';
import { TensionsService } from '../../tensions/tensions.service';
import { SenseTensionCommand } from '../../tensions/commands';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class CreateTensionTool implements McpTool<McpCreateTensionInput> {
  readonly name = 'create_tension' as const;
  readonly description =
    'Create a new tension for an actor. Requires a `name` and the owning `actorId`; optional ' +
    'current context, potential future and a 1-10 `score`. New tensions start in the "alive" ' +
    'state — state transitions are not available over MCP.';
  readonly permission = 'tensions:write';
  readonly inputSchema = mcpCreateTensionInputSchema;

  constructor(
    private readonly commandBus: CommandBus,
    private readonly tensionsService: TensionsService,
  ) {}

  async execute(input: McpCreateTensionInput): Promise<unknown> {
    const id = await this.commandBus.execute<SenseTensionCommand, string>(
      new SenseTensionCommand(input),
    );
    return this.tensionsService.findOne(id);
  }
}
