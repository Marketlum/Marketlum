import { z } from 'zod';
import { AgentType } from '../enums/agent-type.enum';

const fileSummarySchema = z.object({
  id: z.string().uuid(),
  originalName: z.string(),
  storedName: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

const partySummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(AgentType),
});

export const createAgreementSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  link: z.union([z.string().url(), z.literal('')]).optional(),
  parentId: z.string().uuid().optional(),
  fileId: z.string().uuid().nullable().optional(),
  partyIds: z.array(z.string().uuid()).min(2),
});

export const updateAgreementSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  link: z.union([z.string().url(), z.literal('')]).optional(),
  fileId: z.string().uuid().nullable().optional(),
  partyIds: z.array(z.string().uuid()).min(2).optional(),
});

export const moveAgreementSchema = z.object({
  parentId: z.string().uuid().nullable(),
});

export const agreementResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  content: z.string().nullable(),
  link: z.string().nullable(),
  level: z.number(),
  file: fileSummarySchema.nullable(),
  parties: z.array(partySummarySchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateAgreementInput = z.infer<typeof createAgreementSchema>;
export type UpdateAgreementInput = z.infer<typeof updateAgreementSchema>;
export type MoveAgreementInput = z.infer<typeof moveAgreementSchema>;
export type AgreementResponse = z.infer<typeof agreementResponseSchema>;

export interface AgreementTreeNode {
  id: string;
  title: string;
  content: string | null;
  link: string | null;
  level: number;
  file: { id: string; originalName: string; storedName: string; mimeType: string; size: number } | null;
  parties: { id: string; name: string; type: AgentType }[];
  createdAt: string;
  updatedAt: string;
  children: AgreementTreeNode[];
}
