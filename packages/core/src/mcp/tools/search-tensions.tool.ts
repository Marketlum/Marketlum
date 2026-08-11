import { Injectable } from '@nestjs/common';
import { mcpSearchTensionsInputSchema, McpSearchTensionsInput } from '@marketlum/shared';
import { TensionsService } from '../../tensions/tensions.service';
import { McpTool } from '../mcp-tool.interface';

@Injectable()
export class SearchTensionsTool implements McpTool<McpSearchTensionsInput> {
  readonly name = 'search_tensions' as const;
  readonly description =
    'List the market\'s tensions (gaps between current state and a desired future) with ' +
    'pagination and `search` text. Returns a paginated envelope { data, meta }.';
  readonly permission = 'tensions:read';
  readonly inputSchema = mcpSearchTensionsInputSchema;

  constructor(private readonly tensionsService: TensionsService) {}

  execute(input: McpSearchTensionsInput): Promise<unknown> {
    return this.tensionsService.search(input);
  }
}
