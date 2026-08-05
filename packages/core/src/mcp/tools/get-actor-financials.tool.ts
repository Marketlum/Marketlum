import { Injectable } from '@nestjs/common';
import { mcpGetAgentFinancialsInputSchema, McpGetAgentFinancialsInput } from '@marketlum/shared';
import { AgentFinancialsService } from '../../invoices/agent-financials.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class GetAgentFinancialsTool implements McpTool<McpGetAgentFinancialsInput> {
  readonly name = 'get_agent_financials' as const;
  readonly description =
    'Financial aggregates for one agent and year: revenue, expenses and net, as a summary plus ' +
    'monthly and quarterly breakdowns, in the agent\'s functional currency. Set `consolidated` to true ' +
    'to include descendant agents. Use this to answer "how is agent X doing financially" questions; ' +
    'amounts are decimal strings and may be null when no exchange rate was available.';
  readonly permission = 'agents:read';
  readonly inputSchema = mcpGetAgentFinancialsInputSchema;

  constructor(private readonly agentFinancialsService: AgentFinancialsService) {}

  execute(input: McpGetAgentFinancialsInput): Promise<unknown> {
    const { agentId, ...query } = input;
    return this.agentFinancialsService.forAgent(agentId, query);
  }
}
