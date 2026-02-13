import { z } from 'zod';
import { AgentType } from '../enums/agent-type.enum';

const agentSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(AgentType),
});

const valueSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const valueInstanceSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const valueStreamSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const decimalStringRegex = /^\d+(\.\d{1,2})?$/;

export const createInvoiceItemSchema = z.object({
  valueId: z.string().uuid().nullable().optional(),
  valueInstanceId: z.string().uuid().nullable().optional(),
  quantity: z.string().regex(decimalStringRegex, 'Must be a decimal string'),
  unitPrice: z.string().regex(decimalStringRegex, 'Must be a decimal string'),
  total: z.string().regex(decimalStringRegex, 'Must be a decimal string'),
});

export const createInvoiceSchema = z.object({
  number: z.string().min(1),
  fromAgentId: z.string().uuid(),
  toAgentId: z.string().uuid(),
  issuedAt: z.string(),
  dueAt: z.string(),
  currencyId: z.string().uuid(),
  paid: z.boolean().default(false),
  link: z.string().optional(),
  fileId: z.string().uuid().nullable().optional(),
  valueStreamId: z.string().uuid().nullable().optional(),
  items: z.array(createInvoiceItemSchema).optional(),
});

export const updateInvoiceSchema = z.object({
  number: z.string().min(1).optional(),
  fromAgentId: z.string().uuid().optional(),
  toAgentId: z.string().uuid().optional(),
  issuedAt: z.string().optional(),
  dueAt: z.string().optional(),
  currencyId: z.string().uuid().optional(),
  paid: z.boolean().optional(),
  link: z.string().nullable().optional(),
  fileId: z.string().uuid().nullable().optional(),
  valueStreamId: z.string().uuid().nullable().optional(),
  items: z.array(createInvoiceItemSchema).optional(),
});

export const invoiceItemResponseSchema = z.object({
  id: z.string().uuid(),
  value: valueSummarySchema.nullable(),
  valueInstance: valueInstanceSummarySchema.nullable(),
  quantity: z.string(),
  unitPrice: z.string(),
  total: z.string(),
});

export const invoiceResponseSchema = z.object({
  id: z.string().uuid(),
  number: z.string(),
  fromAgent: agentSummarySchema,
  toAgent: agentSummarySchema,
  issuedAt: z.string(),
  dueAt: z.string(),
  currency: valueSummarySchema,
  paid: z.boolean(),
  link: z.string().nullable(),
  file: z.any().nullable(),
  valueStream: valueStreamSummarySchema.nullable(),
  items: z.array(invoiceItemResponseSchema),
  total: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateInvoiceItemInput = z.infer<typeof createInvoiceItemSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type InvoiceItemResponse = z.infer<typeof invoiceItemResponseSchema>;
export type InvoiceResponse = z.infer<typeof invoiceResponseSchema>;
