import { Inject, Injectable } from '@nestjs/common';
import { AnyMcpTool, MCP_TOOLS } from './mcp-tool.interface';

@Injectable()
export class McpToolRegistry {
  constructor(@Inject(MCP_TOOLS) private readonly tools: AnyMcpTool[]) {}

  all(): AnyMcpTool[] {
    return this.tools;
  }

  find(name: string): AnyMcpTool | undefined {
    return this.tools.find((tool) => tool.name === name);
  }
}
