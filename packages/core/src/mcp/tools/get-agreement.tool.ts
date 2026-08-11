import { Injectable } from '@nestjs/common';
import { mcpGetAgreementInputSchema, McpGetAgreementInput } from '@marketlum/shared';
import { AgreementsService } from '../../agreements/agreements.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class GetAgreementTool implements McpTool<McpGetAgreementInput> {
  readonly name = 'get_agreement' as const;
  readonly description =
    'Fetch one agreement by id with its title, content, parties and template. Use after ' +
    'search_agreements when you have the id.';
  readonly permission = 'agreements:read';
  readonly inputSchema = mcpGetAgreementInputSchema;

  constructor(private readonly agreementsService: AgreementsService) {}

  execute(input: McpGetAgreementInput): Promise<unknown> {
    return this.agreementsService.findOne(input.id);
  }
}
