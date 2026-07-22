import { z } from 'zod';
import { AgentType } from '../enums/agent-type.enum';
import { OrderState } from '../enums/order-state.enum';

const agentSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(AgentType),
});

const valueSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
});

const valueInstanceSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
});

const channelSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
});

const pipelineSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
});

const localeSummarySchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
});

const decimalStringRegex = /^\d+(\.\d{1,2})?$/;

export const orderAddressSchema = z.object({
  countryCode: z.string().length(2),
  line1: z.string().min(1).max(255),
  line2: z.string().max(255).nullable().optional(),
  city: z.string().min(1).max(255),
  postalCode: z.string().min(1).max(20),
});

export const createOrderItemSchema = z.object({
  valueId: z.string().uuid().nullable().optional(),
  valueInstanceId: z.string().uuid().nullable().optional(),
  quantity: z.string().regex(decimalStringRegex, 'Must be a decimal string'),
  unitPrice: z.string().regex(decimalStringRegex, 'Must be a decimal string'),
});

export const createOrderSchema = z.object({
  fromAgentId: z.string().uuid(),
  toAgentId: z.string().uuid(),
  currencyId: z.string().uuid(),
  channelId: z.string().uuid().nullable().optional(),
  pipelineId: z.string().uuid().nullable().optional(),
  localeId: z.string().uuid().nullable().optional(),
  shippingAddress: orderAddressSchema.nullable().optional(),
  billingAddress: orderAddressSchema.nullable().optional(),
  items: z.array(createOrderItemSchema).optional(),
});

export const updateOrderSchema = createOrderSchema.partial();

export const orderAddressResponseSchema = z.object({
  countryCode: z.string(),
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string(),
  postalCode: z.string(),
});

export const orderItemResponseSchema = z.object({
  id: z.string().uuid(),
  value: valueSummarySchema.nullable(),
  valueInstance: valueInstanceSummarySchema.nullable(),
  quantity: z.string(),
  unitPrice: z.string(),
  total: z.string(),
  position: z.number().int(),
});

export const orderResponseSchema = z.object({
  id: z.string().uuid(),
  number: z.string(),
  state: z.nativeEnum(OrderState),
  fromAgent: agentSummarySchema,
  toAgent: agentSummarySchema,
  currency: valueSummarySchema,
  channel: channelSummarySchema.nullable(),
  pipeline: pipelineSummarySchema.nullable(),
  locale: localeSummarySchema.nullable(),
  shippingAddress: orderAddressResponseSchema.nullable(),
  billingAddress: orderAddressResponseSchema.nullable(),
  items: z.array(orderItemResponseSchema),
  total: z.string(),
  invoicedTotal: z.string().nullable().optional(),
  placedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type OrderAddressInput = z.infer<typeof orderAddressSchema>;
export type CreateOrderItemInput = z.infer<typeof createOrderItemSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type OrderItemResponse = z.infer<typeof orderItemResponseSchema>;
export type OrderResponse = z.infer<typeof orderResponseSchema>;
