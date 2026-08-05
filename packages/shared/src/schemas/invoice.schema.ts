import { z } from 'zod';
import { ActorType } from '../enums/actor-type.enum';
import { InvoiceMarket } from '../enums/invoice-market.enum';

const actorSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(ActorType),
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
  fromActorId: z.string().uuid(),
  toActorId: z.string().uuid(),
  issuedAt: z.string(),
  dueAt: z.string(),
  currencyId: z.string().uuid(),
  market: z.nativeEnum(InvoiceMarket).default(InvoiceMarket.EXTERNAL),
  onBehalfOfActorId: z.string().uuid().nullable().optional(),
  paid: z.boolean().default(false),
  link: z.string().optional(),
  fileId: z.string().uuid().nullable().optional(),
  channelId: z.string().uuid().nullable().optional(),
  orderId: z.string().uuid().nullable().optional(),
  items: z.array(createInvoiceItemSchema).optional(),
});

export const updateInvoiceSchema = z.object({
  number: z.string().min(1).optional(),
  fromActorId: z.string().uuid().optional(),
  toActorId: z.string().uuid().optional(),
  issuedAt: z.string().optional(),
  dueAt: z.string().optional(),
  currencyId: z.string().uuid().optional(),
  market: z.nativeEnum(InvoiceMarket).optional(),
  onBehalfOfActorId: z.string().uuid().nullable().optional(),
  paid: z.boolean().optional(),
  link: z.string().nullable().optional(),
  fileId: z.string().uuid().nullable().optional(),
  channelId: z.string().uuid().nullable().optional(),
  orderId: z.string().uuid().nullable().optional(),
  items: z.array(createInvoiceItemSchema).optional(),
});

export const invoiceItemResponseSchema = z.object({
  id: z.string().uuid(),
  value: valueSummarySchema.nullable(),
  valueInstance: valueInstanceSummarySchema.nullable(),
  quantity: z.string(),
  unitPrice: z.string(),
  total: z.string(),
  presentationRate: z.string().nullable(),
  presentationAmount: z.string().nullable(),
  fromActorRate: z.string().nullable(),
  fromActorAmount: z.string().nullable(),
  toActorRate: z.string().nullable(),
  toActorAmount: z.string().nullable(),
});

export const invoiceResponseSchema = z.object({
  id: z.string().uuid(),
  number: z.string(),
  fromActor: actorSummarySchema,
  toActor: actorSummarySchema,
  issuedAt: z.string(),
  dueAt: z.string(),
  currency: valueSummarySchema,
  market: z.nativeEnum(InvoiceMarket),
  onBehalfOfActor: actorSummarySchema.nullable(),
  mirrorInvoice: z
    .object({ id: z.string().uuid(), number: z.string() })
    .nullable(),
  sourceInvoice: z
    .object({
      id: z.string().uuid(),
      number: z.string(),
      fromActor: z.object({ id: z.string().uuid(), name: z.string() }),
    })
    .nullable(),
  paid: z.boolean(),
  link: z.string().nullable(),
  file: z.any().nullable(),
  channel: channelSummarySchema.nullable(),
  order: z.object({ id: z.string().uuid(), number: z.string() }).nullable(),
  items: z.array(invoiceItemResponseSchema),
  total: z.string(),
  presentationTotal: z.string().nullable(),
  fromActorTotal: z.string().nullable(),
  toActorTotal: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateInvoiceItemInput = z.infer<typeof createInvoiceItemSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type InvoiceItemResponse = z.infer<typeof invoiceItemResponseSchema>;
export type InvoiceResponse = z.infer<typeof invoiceResponseSchema>;
