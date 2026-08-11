import { Injectable } from '@nestjs/common';
import { mcpUpdateOfferingInputSchema, McpUpdateOfferingInput } from '@marketlum/shared';
import { OfferingsService } from '../../offerings/offerings.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class UpdateOfferingTool implements McpTool<McpUpdateOfferingInput> {
  readonly name = 'update_offering' as const;
  readonly description =
    'Update fields of an existing offering by `id` (name, purpose, description, components, ' +
    'validity window). The lifecycle state cannot be changed over MCP. Returns the updated ' +
    'offering.';
  readonly permission = 'offerings:write';
  readonly inputSchema = mcpUpdateOfferingInputSchema;

  constructor(private readonly offeringsService: OfferingsService) {}

  execute(input: McpUpdateOfferingInput): Promise<unknown> {
    const { id, ...rest } = input;
    return this.offeringsService.update(id, rest);
  }
}
