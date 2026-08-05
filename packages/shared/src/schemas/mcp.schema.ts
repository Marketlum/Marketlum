import { z } from 'zod';
import { AgentType } from '../enums/agent-type.enum';
import { paginationQuerySchema } from './pagination.schema';
import { searchQuerySchema } from './search.schema';
import { agentFinancialsQuerySchema } from './agent-financials.schema';
import { dashboardQuerySchema } from './dashboard.schema';
import { exchangeRateLookupQuerySchema } from './exchange-rate.schema';

// Spec 023: the MCP tool surface. Input schemas derive from the existing REST
// query schemas so the MCP contract cannot drift from API validation. List
// tools reuse the REST pagination params but cap `limit` at 100 (default 20)
// to keep tool results context-friendly for agents.

export const MCP_TOOL_NAMES = [
  'search_market',
  'search_agents',
  'get_agent',
  'get_agent_financials',
  'search_invoices',
  'get_invoice',
  'search_orders',
  'get_order',
  'list_value_streams',
  'get_dashboard_summary',
  'get_exchange_rate',
] as const;
export type McpToolName = (typeof MCP_TOOL_NAMES)[number];

export const MCP_TOOL_ERROR_CODES = [
  'FORBIDDEN',
  'NOT_FOUND',
  'INVALID_INPUT',
  'INTERNAL',
] as const;
export type McpToolErrorCode = (typeof MCP_TOOL_ERROR_CODES)[number];

export const mcpToolErrorSchema = z.object({
  code: z.enum(MCP_TOOL_ERROR_CODES),
  message: z.string(),
});
export type McpToolError = z.infer<typeof mcpToolErrorSchema>;

const mcpPaginationSchema = paginationQuerySchema.extend({
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const mcpSearchMarketInputSchema = searchQuerySchema;
export type McpSearchMarketInput = z.infer<typeof mcpSearchMarketInputSchema>;

export const mcpSearchAgentsInputSchema = mcpPaginationSchema.extend({
  type: z.nativeEnum(AgentType).optional(),
  taxonomyId: z.string().uuid().optional(),
});
export type McpSearchAgentsInput = z.infer<typeof mcpSearchAgentsInputSchema>;

export const mcpGetAgentInputSchema = z.object({
  id: z.string().uuid(),
});
export type McpGetAgentInput = z.infer<typeof mcpGetAgentInputSchema>;

export const mcpGetAgentFinancialsInputSchema = agentFinancialsQuerySchema.extend({
  agentId: z.string().uuid(),
});
export type McpGetAgentFinancialsInput = z.infer<typeof mcpGetAgentFinancialsInputSchema>;

export const mcpSearchInvoicesInputSchema = mcpPaginationSchema.extend({
  agentId: z.string().uuid().optional(),
  fromAgentId: z.string().uuid().optional(),
  toAgentId: z.string().uuid().optional(),
  channelId: z.string().uuid().optional(),
  currencyId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  market: z.string().optional(),
  paid: z.boolean().optional(),
});
export type McpSearchInvoicesInput = z.infer<typeof mcpSearchInvoicesInputSchema>;

export const mcpGetInvoiceInputSchema = z.object({
  id: z.string().uuid(),
});
export type McpGetInvoiceInput = z.infer<typeof mcpGetInvoiceInputSchema>;

export const mcpSearchOrdersInputSchema = mcpPaginationSchema.extend({
  state: z.string().optional(),
  agentId: z.string().uuid().optional(),
  fromAgentId: z.string().uuid().optional(),
  toAgentId: z.string().uuid().optional(),
  channelId: z.string().uuid().optional(),
  pipelineId: z.string().uuid().optional(),
  currencyId: z.string().uuid().optional(),
});
export type McpSearchOrdersInput = z.infer<typeof mcpSearchOrdersInputSchema>;

export const mcpGetOrderInputSchema = z.object({
  id: z.string().uuid(),
});
export type McpGetOrderInput = z.infer<typeof mcpGetOrderInputSchema>;

export const mcpListValueStreamsInputSchema = mcpPaginationSchema;
export type McpListValueStreamsInput = z.infer<typeof mcpListValueStreamsInputSchema>;

export const mcpGetDashboardSummaryInputSchema = dashboardQuerySchema;
export type McpGetDashboardSummaryInput = z.infer<typeof mcpGetDashboardSummaryInputSchema>;

export const mcpGetExchangeRateInputSchema = exchangeRateLookupQuerySchema;
export type McpGetExchangeRateInput = z.infer<typeof mcpGetExchangeRateInputSchema>;
