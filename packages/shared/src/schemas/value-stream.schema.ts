import { z } from 'zod';

const fileSummarySchema = z.object({
  id: z.string().uuid(),
  originalName: z.string(),
  storedName: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

const leadSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string(),
});

export const createValueStreamSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().optional(),
  parentId: z.string().uuid().optional(),
  leadUserId: z.string().uuid().nullable().optional(),
  imageId: z.string().uuid().nullable().optional(),
});

export const updateValueStreamSchema = z.object({
  name: z.string().min(1).optional(),
  purpose: z.string().optional(),
  leadUserId: z.string().uuid().nullable().optional(),
  imageId: z.string().uuid().nullable().optional(),
});

export const moveValueStreamSchema = z.object({
  parentId: z.string().uuid().nullable(),
});

export const valueStreamResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  purpose: z.string().nullable(),
  level: z.number(),
  lead: leadSummarySchema.nullable(),
  image: fileSummarySchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateValueStreamInput = z.infer<typeof createValueStreamSchema>;
export type UpdateValueStreamInput = z.infer<typeof updateValueStreamSchema>;
export type MoveValueStreamInput = z.infer<typeof moveValueStreamSchema>;
export type ValueStreamResponse = z.infer<typeof valueStreamResponseSchema>;

export interface ValueStreamTreeNode {
  id: string;
  name: string;
  purpose: string | null;
  level: number;
  lead: { id: string; name: string; email: string } | null;
  image: { id: string; originalName: string; storedName: string; mimeType: string; size: number } | null;
  createdAt: string;
  updatedAt: string;
  children: ValueStreamTreeNode[];
}
