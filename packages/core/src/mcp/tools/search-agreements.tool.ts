import { Injectable } from '@nestjs/common';
import { mcpSearchAgreementsInputSchema, McpSearchAgreementsInput } from '@marketlum/shared';
import { AgreementsService } from '../../agreements/agreements.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class SearchAgreementsTool implements McpTool<McpSearchAgreementsInput> {
  readonly name = 'search_agreements' as const;
  readonly description =
    'List agreements with pagination, `search` text and an optional `partyId` filter ' +
    '(agreements a given actor is party to). Returns a paginated envelope { data, meta }.';
  readonly permission = 'agreements:read';
  readonly inputSchema = mcpSearchAgreementsInputSchema;

  constructor(private readonly agreementsService: AgreementsService) {}

  execute(input: McpSearchAgreementsInput): Promise<unknown> {
    return this.agreementsService.search(input);
  }
}
