import { Injectable } from '@nestjs/common';
import { mcpListValueStreamsInputSchema, McpListValueStreamsInput } from '@marketlum/shared';
import { ValueStreamsService } from '../../value-streams/value-streams.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class ListValueStreamsTool implements McpTool<McpListValueStreamsInput> {
  readonly name = 'list_value_streams' as const;
  readonly description =
    'List the market\'s value streams with pagination and an optional `search` text filter. ' +
    'Value streams describe how the market creates value (e.g. product lines, service offerings). ' +
    'Returns a paginated envelope { data, meta: { page, limit, total, totalPages } }.';
  readonly permission = 'value-streams:read';
  readonly inputSchema = mcpListValueStreamsInputSchema;

  constructor(private readonly valueStreamsService: ValueStreamsService) {}

  execute(input: McpListValueStreamsInput): Promise<unknown> {
    return this.valueStreamsService.search(input);
  }
}
