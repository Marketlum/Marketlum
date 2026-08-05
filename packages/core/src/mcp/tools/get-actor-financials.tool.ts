import { Injectable } from '@nestjs/common';
import { mcpGetActorFinancialsInputSchema, McpGetActorFinancialsInput } from '@marketlum/shared';
import { ActorFinancialsService } from '../../invoices/actor-financials.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class GetActorFinancialsTool implements McpTool<McpGetActorFinancialsInput> {
  readonly name = 'get_actor_financials' as const;
  readonly description =
    'Financial aggregates for one actor and year: revenue, expenses and net, as a summary plus ' +
    'monthly and quarterly breakdowns, in the actor\'s functional currency. Set `consolidated` to true ' +
    'to include descendant actors. Use this to answer "how is actor X doing financially" questions; ' +
    'amounts are decimal strings and may be null when no exchange rate was available.';
  readonly permission = 'actors:read';
  readonly inputSchema = mcpGetActorFinancialsInputSchema;

  constructor(private readonly actorFinancialsService: ActorFinancialsService) {}

  execute(input: McpGetActorFinancialsInput): Promise<unknown> {
    const { actorId, ...query } = input;
    return this.actorFinancialsService.forActor(actorId, query);
  }
}
