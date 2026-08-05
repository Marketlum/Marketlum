import { Injectable } from '@nestjs/common';
import { mcpSearchAgentsInputSchema, McpSearchAgentsInput } from '@marketlum/shared';
import { AgentsService } from '../../agents/agents.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class SearchAgentsTool implements McpTool<McpSearchAgentsInput> {
  readonly name = 'search_agents' as const;
  readonly description =
    'List the market\'s agents (organizations and people) with pagination and optional filtering by ' +
    'agent type or taxonomy. Use this to find an agent id by browsing or narrowing with the `search` ' +
    'text filter. Returns a paginated envelope { data, meta: { page, limit, total, totalPages } }.';
  readonly permission = 'agents:read';
  readonly inputSchema = mcpSearchAgentsInputSchema;

  constructor(private readonly agentsService: AgentsService) {}

  execute(input: McpSearchAgentsInput): Promise<unknown> {
    return this.agentsService.findAll(input);
  }
}
