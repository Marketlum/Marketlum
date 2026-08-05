import type { ZodType, ZodTypeDef } from 'zod';
import type { McpToolName } from '@marketlum/shared';
import type { User } from '../users/entities/user.entity';

/**
 * One MCP tool (spec 023). Each tool wraps an existing core service call and
 * declares the same permission resource its REST counterpart is gated by.
 * The registry validates `inputSchema` before `execute` is invoked, so
 * implementations receive parsed, defaulted input.
 */
export interface McpTool<TInput = unknown> {
  readonly name: McpToolName;
  /** Actor-facing prose: what the tool returns AND when to use it. */
  readonly description: string;
  /** Permission string (`resource:action`) required to list and call the tool. */
  readonly permission: string;
  readonly inputSchema: ZodType<TInput, ZodTypeDef, unknown>;
  execute(input: TInput, user: User): Promise<unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyMcpTool = McpTool<any>;

/** Multi-provider token collecting every registered tool. Designed as the seam
 * a future `mcpTools?` plugin extension point (spec 023 Q19) can feed. */
export const MCP_TOOLS = Symbol('MCP_TOOLS');
