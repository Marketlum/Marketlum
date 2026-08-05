import { Injectable } from '@nestjs/common';
import { mcpSearchActorsInputSchema, McpSearchActorsInput } from '@marketlum/shared';
import { ActorsService } from '../../actors/actors.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class SearchActorsTool implements McpTool<McpSearchActorsInput> {
  readonly name = 'search_actors' as const;
  readonly description =
    'List the market\'s actors (organizations and people) with pagination and optional filtering by ' +
    'actor type or taxonomy. Use this to find an actor id by browsing or narrowing with the `search` ' +
    'text filter. Returns a paginated envelope { data, meta: { page, limit, total, totalPages } }.';
  readonly permission = 'actors:read';
  readonly inputSchema = mcpSearchActorsInputSchema;

  constructor(private readonly actorsService: ActorsService) {}

  execute(input: McpSearchActorsInput): Promise<unknown> {
    return this.actorsService.findAll(input);
  }
}
