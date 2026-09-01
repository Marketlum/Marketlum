import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { mcpUpdateTensionInputSchema, McpUpdateTensionInput } from '@marketlum/shared';
import { TensionsService } from '../../tensions/tensions.service';
import {
  AssignTensionLeadCommand,
  ReassignTensionCommand,
  RenameTensionCommand,
  RescoreTensionCommand,
  ReviseTensionContextCommand,
} from '../../tensions/commands';
import { McpTool } from '../mcp-tool.interface';

/**
 * Spec 027 replaced PATCH with per-command endpoints, but MCP keeps a single
 * coherent `update_tension` tool (Q14): agents should not have to sequence six
 * micro-tools to correct a tension's wording and score. The handler fans the
 * supplied fields out to the individual commands, skipping any that are absent.
 * Commands are dispatched sequentially so the resulting stream reads in a
 * predictable order.
 */
@Injectable()
export class UpdateTensionTool implements McpTool<McpUpdateTensionInput> {
  readonly name = 'update_tension' as const;
  readonly description =
    'Update fields of an existing tension by `id` (name, context, potential future, score, ' +
    'actor). State transitions are not available over MCP. Returns the updated tension.';
  readonly permission = 'tensions:write';
  readonly inputSchema = mcpUpdateTensionInputSchema;

  constructor(
    private readonly commandBus: CommandBus,
    private readonly tensionsService: TensionsService,
  ) {}

  async execute(input: McpUpdateTensionInput): Promise<unknown> {
    const { id, name, score, currentContext, potentialFuture, actorId, leadUserId } = input;

    if (name !== undefined) {
      await this.commandBus.execute(new RenameTensionCommand(id, name));
    }
    if (score !== undefined) {
      await this.commandBus.execute(new RescoreTensionCommand(id, score));
    }
    if (currentContext !== undefined || potentialFuture !== undefined) {
      await this.commandBus.execute(
        new ReviseTensionContextCommand(id, currentContext, potentialFuture),
      );
    }
    if (actorId !== undefined) {
      await this.commandBus.execute(new ReassignTensionCommand(id, actorId));
    }
    if (leadUserId !== undefined) {
      await this.commandBus.execute(new AssignTensionLeadCommand(id, leadUserId));
    }

    return this.tensionsService.findOne(id);
  }
}
