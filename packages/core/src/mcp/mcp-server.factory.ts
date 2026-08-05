import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  type CallToolResult,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodTypeAny } from 'zod';
import { McpToolError, McpToolErrorCode } from '@marketlum/shared';
import { PermissionsService } from '../roles/permissions.service';
import { McpToolRegistry } from './mcp-tool.registry';
import { AnyMcpTool } from './mcp-tool.interface';
import { User } from '../users/entities/user.entity';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const corePackage = require('../../package.json') as { version: string };

function toolError(code: McpToolErrorCode, message: string): CallToolResult {
  const payload: McpToolError = { code, message };
  return { content: [{ type: 'text', text: JSON.stringify(payload) }], isError: true };
}

// zod-to-json-schema's generic inference blows TS's instantiation depth on the
// tool-schema union; the type-erased call is safe because MCP inputSchema is
// plain JSON Schema at the wire level.
const toInputJsonSchema = zodToJsonSchema as unknown as (
  schema: ZodTypeAny,
  options: { $refStrategy: 'none' },
) => { type: 'object'; [key: string]: unknown };

/**
 * Builds a per-request MCP server (spec 023). The server is stateless — a new
 * instance is wired for every POST /mcp — so the caller's effective
 * permissions can be closed over: tools/list is filtered to what the caller
 * may use, and tools/call re-checks the permission before executing.
 */
@Injectable()
export class McpServerFactory {
  private readonly logger = new Logger('Mcp');

  constructor(
    private readonly registry: McpToolRegistry,
    private readonly permissionsService: PermissionsService,
  ) {}

  async create(user: User): Promise<Server> {
    const effective = await this.permissionsService.getEffectivePermissions(user.id);
    const permitted = (tool: AnyMcpTool) =>
      this.permissionsService.hasPermission(effective, tool.permission);

    const server = new Server(
      { name: 'marketlum', version: corePackage.version },
      { capabilities: { tools: {} } },
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.registry
        .all()
        .filter(permitted)
        .map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: toInputJsonSchema(tool.inputSchema, { $refStrategy: 'none' }),
        })),
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
      const name = request.params.name;
      const tool = this.registry.find(name);
      if (!tool) {
        throw new McpError(ErrorCode.InvalidParams, `Unknown tool: ${name}`);
      }
      const startedAt = Date.now();
      const result = await this.callTool(tool, request.params.arguments ?? {}, user, permitted);
      this.logger.log(
        JSON.stringify({
          tool: name,
          userId: user.id,
          durationMs: Date.now() - startedAt,
          isError: result.isError === true,
        }),
      );
      return result;
    });

    return server;
  }

  private async callTool(
    tool: AnyMcpTool,
    args: unknown,
    user: User,
    permitted: (tool: AnyMcpTool) => boolean,
  ): Promise<CallToolResult> {
    if (!permitted(tool)) {
      return toolError('FORBIDDEN', `Missing permission: ${tool.permission}`);
    }

    const parsed = tool.inputSchema.safeParse(args);
    if (!parsed.success) {
      const details = parsed.error.errors
        .map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`)
        .join('; ');
      return toolError('INVALID_INPUT', details);
    }

    try {
      const output = await tool.execute(parsed.data, user);
      return { content: [{ type: 'text', text: JSON.stringify(output ?? null) }] };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return toolError('NOT_FOUND', error.message);
      }
      if (error instanceof ForbiddenException) {
        return toolError('FORBIDDEN', error.message);
      }
      this.logger.error(`Tool ${tool.name} failed`, error instanceof Error ? error.stack : String(error));
      return toolError('INTERNAL', 'Unexpected error executing tool');
    }
  }
}
