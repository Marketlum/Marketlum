import { Injectable } from '@nestjs/common';
import { mcpGetOfferingInputSchema, McpGetOfferingInput } from '@marketlum/shared';
import { OfferingsService } from '../../offerings/offerings.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class GetOfferingTool implements McpTool<McpGetOfferingInput> {
  readonly name = 'get_offering' as const;
  readonly description =
    'Fetch one offering by id with its components, pricing, provider actor and lifecycle ' +
    'state. Use after search_offerings when you have the id.';
  readonly permission = 'offerings:read';
  readonly inputSchema = mcpGetOfferingInputSchema;

  constructor(private readonly offeringsService: OfferingsService) {}

  execute(input: McpGetOfferingInput): Promise<unknown> {
    return this.offeringsService.findOne(input.id);
  }
}
