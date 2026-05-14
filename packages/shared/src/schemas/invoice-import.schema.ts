import { z } from 'zod';

const decimalString = z.string().regex(/^\d+(\.\d{1,2})?$/);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// Shape Claude is instructed to return.
export const claudeInvoiceExtractionSchema = z.object({
  number: z.string().nullable(),
  issuedAt: isoDate.nullable(),
  dueAt: isoDate.nullable(),
  fromAgent: z.object({ name: z.string() }),
  toAgent: z.object({ name: z.string() }),
  currency: z.object({ name: z.string() }),
  items: z.array(
    z.object({
      description: z.string(),
      valueName: z.string().optional(),
      quantity: decimalString,
      unitPrice: decimalString,
      total: decimalString,
    }),
  ),
  notes: z.string().nullable(),
});

const namedRefSchema = z.object({
  name: z.string(),
  id: z.string().uuid().nullable(),
});

export const invoiceImportResponseSchema = z.object({
  fileId: z.string().uuid(),
  extracted: z.object({
    number: z.string().nullable(),
    issuedAt: z.string().nullable(),
    dueAt: z.string().nullable(),
    fromAgent: namedRefSchema,
    toAgent: namedRefSchema,
    currency: namedRefSchema,
    items: z.array(
      z.object({
        description: z.string(),
        quantity: z.string(),
        unitPrice: z.string(),
        total: z.string(),
        value: namedRefSchema.nullable(),
      }),
    ),
    notes: z.string().nullable(),
  }),
  warnings: z.array(z.string()),
});

export type ClaudeInvoiceExtraction = z.infer<typeof claudeInvoiceExtractionSchema>;
export type InvoiceImportResponse = z.infer<typeof invoiceImportResponseSchema>;
