import { Injectable } from '@nestjs/common';
import { mcpCreateOfferingInputSchema, McpCreateOfferingInput, OfferingState } from '@marketlum/shared';
import { OfferingsService } from '../../offerings/offerings.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class CreateOfferingTool implements McpTool<McpCreateOfferingInput> {
  readonly name = 'create_offering' as const;
  readonly description =
    'Create a new offering. Requires a `name`; optional purpose, description, provider ' +
    '`actorId`, components and validity window. New offerings always start as drafts — ' +
    'lifecycle state cannot be set over MCP.';
  readonly permission = 'offerings:write';
  readonly inputSchema = mcpCreateOfferingInputSchema;

  constructor(private readonly offeringsService: OfferingsService) {}

  execute(input: McpCreateOfferingInput): Promise<unknown> {
    // MCP-created offerings always start as drafts (state is not exposed).
    return this.offeringsService.create({ ...input, state: OfferingState.DRAFT });
  }
}
