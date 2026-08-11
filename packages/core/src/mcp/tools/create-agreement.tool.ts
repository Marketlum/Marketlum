import { Injectable } from '@nestjs/common';
import { mcpCreateAgreementInputSchema, McpCreateAgreementInput } from '@marketlum/shared';
import { AgreementsService } from '../../agreements/agreements.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class CreateAgreementTool implements McpTool<McpCreateAgreementInput> {
  readonly name = 'create_agreement' as const;
  readonly description =
    'Create a new agreement between actors. Requires a `title` and `partyIds` (at least two ' +
    'actor ids); optional content, link, template and parent agreement.';
  readonly permission = 'agreements:write';
  readonly inputSchema = mcpCreateAgreementInputSchema;

  constructor(private readonly agreementsService: AgreementsService) {}

  execute(input: McpCreateAgreementInput): Promise<unknown> {
    return this.agreementsService.create(input);
  }
}
