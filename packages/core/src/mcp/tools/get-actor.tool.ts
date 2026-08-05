import { Injectable } from '@nestjs/common';
import { mcpGetActorInputSchema, McpGetActorInput } from '@marketlum/shared';
import { ActorsService } from '../../actors/actors.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class GetActorTool implements McpTool<McpGetActorInput> {
  readonly name = 'get_actor' as const;
  readonly description =
    'Fetch one actor by id, including its type, codes, addresses and functional currency. ' +
    'Use this when you already know the actor id (e.g. from search_actors or search_market) ' +
    'and need the full detail record.';
  readonly permission = 'actors:read';
  readonly inputSchema = mcpGetActorInputSchema;

  constructor(private readonly actorsService: ActorsService) {}

  execute(input: McpGetActorInput): Promise<unknown> {
    return this.actorsService.findOne(input.id);
  }
}
