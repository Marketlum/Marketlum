import { Injectable } from '@nestjs/common';
import { mcpUpdateAgreementInputSchema, McpUpdateAgreementInput } from '@marketlum/shared';
import { AgreementsService } from '../../agreements/agreements.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class UpdateAgreementTool implements McpTool<McpUpdateAgreementInput> {
  readonly name = 'update_agreement' as const;
  readonly description =
    'Update fields of an existing agreement by `id` (title, content, link, parties, ' +
    'template). Returns the updated agreement.';
  readonly permission = 'agreements:write';
  readonly inputSchema = mcpUpdateAgreementInputSchema;

  constructor(private readonly agreementsService: AgreementsService) {}

  execute(input: McpUpdateAgreementInput): Promise<unknown> {
    const { id, ...rest } = input;
    return this.agreementsService.update(id, rest);
  }
}
