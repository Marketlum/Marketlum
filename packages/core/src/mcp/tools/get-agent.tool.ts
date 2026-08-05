import { Injectable } from '@nestjs/common';
import { mcpGetAgentInputSchema, McpGetAgentInput } from '@marketlum/shared';
import { AgentsService } from '../../agents/agents.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class GetAgentTool implements McpTool<McpGetAgentInput> {
  readonly name = 'get_agent' as const;
  readonly description =
    'Fetch one agent by id, including its type, codes, addresses and functional currency. ' +
    'Use this when you already know the agent id (e.g. from search_agents or search_market) ' +
    'and need the full detail record.';
  readonly permission = 'agents:read';
  readonly inputSchema = mcpGetAgentInputSchema;

  constructor(private readonly agentsService: AgentsService) {}

  execute(input: McpGetAgentInput): Promise<unknown> {
    return this.agentsService.findOne(input.id);
  }
}
