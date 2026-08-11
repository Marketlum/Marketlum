import { z } from 'zod';
import { ActorType } from '../enums/actor-type.enum';
import { paginationQuerySchema } from './pagination.schema';
import { searchQuerySchema } from './search.schema';
import { actorFinancialsQuerySchema } from './actor-financials.schema';
import { dashboardQuerySchema } from './dashboard.schema';
import { exchangeRateLookupQuerySchema } from './exchange-rate.schema';
import { ValueType } from '../enums/value-type.enum';
import { OfferingState } from '../enums/offering-state.enum';
import { createValueSchema, updateValueSchema } from './value.schema';
import { createTensionSchema, updateTensionSchema } from './tension.schema';
import { createAgreementSchema, updateAgreementSchema } from './agreement.schema';
import { createOfferingSchema, updateOfferingSchema } from './offering.schema';
import { createTaxonomySchema, updateTaxonomySchema } from './taxonomy.schema';

// Spec 023: the MCP tool surface. Input schemas derive from the existing REST
// query schemas so the MCP contract cannot drift from API validation. List
// tools reuse the REST pagination params but cap `limit` at 100 (default 20)
// to keep tool results context-friendly for actors.

export const MCP_TOOL_NAMES = [
  'search_market',
  'search_actors',
  'get_actor',
  'get_actor_financials',
  'search_invoices',
  'get_invoice',
  'search_orders',
  'get_order',
  'list_value_streams',
  'get_dashboard_summary',
  'get_exchange_rate',
  'search_values',
  'get_value',
  'create_value',
  'update_value',
  'search_tensions',
  'get_tension',
  'create_tension',
  'update_tension',
  'search_agreements',
  'get_agreement',
  'create_agreement',
  'update_agreement',
  'search_offerings',
  'get_offering',
  'create_offering',
  'update_offering',
  'search_taxonomies',
  'get_taxonomy',
  'create_taxonomy',
  'update_taxonomy',
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

export const mcpSearchActorsInputSchema = mcpPaginationSchema.extend({
  type: z.nativeEnum(ActorType).optional(),
  taxonomyId: z.string().uuid().optional(),
});
export type McpSearchActorsInput = z.infer<typeof mcpSearchActorsInputSchema>;

export const mcpGetActorInputSchema = z.object({
  id: z.string().uuid(),
});
export type McpGetActorInput = z.infer<typeof mcpGetActorInputSchema>;

export const mcpGetActorFinancialsInputSchema = actorFinancialsQuerySchema.extend({
  actorId: z.string().uuid(),
});
export type McpGetActorFinancialsInput = z.infer<typeof mcpGetActorFinancialsInputSchema>;

export const mcpSearchInvoicesInputSchema = mcpPaginationSchema.extend({
  actorId: z.string().uuid().optional(),
  fromActorId: z.string().uuid().optional(),
  toActorId: z.string().uuid().optional(),
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
  actorId: z.string().uuid().optional(),
  fromActorId: z.string().uuid().optional(),
  toActorId: z.string().uuid().optional(),
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

// --- Entity tools (values, tensions, agreements, offerings, taxonomies) ---
// Write inputs reuse the REST create/update schemas so MCP writes validate
// identically to the API. Offerings deliberately omit `state` in both
// directions: lifecycle transitions are not exposed to agents.

const mcpGetByIdSchema = z.object({ id: z.string().uuid() });

export const mcpSearchValuesInputSchema = mcpPaginationSchema.extend({
  type: z.nativeEnum(ValueType).optional(),
});
export type McpSearchValuesInput = z.infer<typeof mcpSearchValuesInputSchema>;
export const mcpGetValueInputSchema = mcpGetByIdSchema;
export type McpGetValueInput = z.infer<typeof mcpGetValueInputSchema>;
export const mcpCreateValueInputSchema = createValueSchema;
export type McpCreateValueInput = z.infer<typeof mcpCreateValueInputSchema>;
export const mcpUpdateValueInputSchema = updateValueSchema.extend({ id: z.string().uuid() });
export type McpUpdateValueInput = z.infer<typeof mcpUpdateValueInputSchema>;

export const mcpSearchTensionsInputSchema = mcpPaginationSchema;
export type McpSearchTensionsInput = z.infer<typeof mcpSearchTensionsInputSchema>;
export const mcpGetTensionInputSchema = mcpGetByIdSchema;
export type McpGetTensionInput = z.infer<typeof mcpGetTensionInputSchema>;
export const mcpCreateTensionInputSchema = createTensionSchema;
export type McpCreateTensionInput = z.infer<typeof mcpCreateTensionInputSchema>;
export const mcpUpdateTensionInputSchema = updateTensionSchema.extend({ id: z.string().uuid() });
export type McpUpdateTensionInput = z.infer<typeof mcpUpdateTensionInputSchema>;

export const mcpSearchAgreementsInputSchema = mcpPaginationSchema.extend({
  partyId: z.string().uuid().optional(),
});
export type McpSearchAgreementsInput = z.infer<typeof mcpSearchAgreementsInputSchema>;
export const mcpGetAgreementInputSchema = mcpGetByIdSchema;
export type McpGetAgreementInput = z.infer<typeof mcpGetAgreementInputSchema>;
export const mcpCreateAgreementInputSchema = createAgreementSchema;
export type McpCreateAgreementInput = z.infer<typeof mcpCreateAgreementInputSchema>;
export const mcpUpdateAgreementInputSchema = updateAgreementSchema.extend({
  id: z.string().uuid(),
});
export type McpUpdateAgreementInput = z.infer<typeof mcpUpdateAgreementInputSchema>;

export const mcpSearchOfferingsInputSchema = mcpPaginationSchema.extend({
  state: z.nativeEnum(OfferingState).optional(),
});
export type McpSearchOfferingsInput = z.infer<typeof mcpSearchOfferingsInputSchema>;
export const mcpGetOfferingInputSchema = mcpGetByIdSchema;
export type McpGetOfferingInput = z.infer<typeof mcpGetOfferingInputSchema>;
export const mcpCreateOfferingInputSchema = createOfferingSchema.omit({ state: true });
export type McpCreateOfferingInput = z.infer<typeof mcpCreateOfferingInputSchema>;
export const mcpUpdateOfferingInputSchema = updateOfferingSchema
  .omit({ state: true })
  .extend({ id: z.string().uuid() });
export type McpUpdateOfferingInput = z.infer<typeof mcpUpdateOfferingInputSchema>;

export const mcpSearchTaxonomiesInputSchema = mcpPaginationSchema;
export type McpSearchTaxonomiesInput = z.infer<typeof mcpSearchTaxonomiesInputSchema>;
export const mcpGetTaxonomyInputSchema = mcpGetByIdSchema;
export type McpGetTaxonomyInput = z.infer<typeof mcpGetTaxonomyInputSchema>;
export const mcpCreateTaxonomyInputSchema = createTaxonomySchema;
export type McpCreateTaxonomyInput = z.infer<typeof mcpCreateTaxonomyInputSchema>;
export const mcpUpdateTaxonomyInputSchema = updateTaxonomySchema.extend({
  id: z.string().uuid(),
});
export type McpUpdateTaxonomyInput = z.infer<typeof mcpUpdateTaxonomyInputSchema>;
