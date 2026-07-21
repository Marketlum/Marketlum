import { z } from 'zod';
import { AgreementTemplateType } from '../enums/agreement-template-type.enum';
import { AgentType } from '../enums/agent-type.enum';
import { codeSchema } from './code.schema';

export const createAgreementTemplateSchema = z.object({
  code: codeSchema,
  name: z.string().min(1),
  type: z.nativeEnum(AgreementTemplateType),
  purpose: z.string().optional(),
  description: z.string().optional(),
  link: z.string().url().optional(),
  parentId: z.string().uuid().optional(),
  valueStreamId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
});

export const updateAgreementTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.nativeEnum(AgreementTemplateType).optional(),
  purpose: z.string().optional(),
  description: z.string().optional(),
  link: z.string().url().optional(),
  valueStreamId: z.string().uuid().nullable().optional(),
  agentId: z.string().uuid().nullable().optional(),
});

export const moveAgreementTemplateSchema = z.object({
  parentId: z.string().uuid().nullable(),
});

export const agreementTemplateSearchQuerySchema = z.object({
  type: z.nativeEnum(AgreementTemplateType).optional(),
  valueStreamId: z.string().uuid().optional(),
  valueStreamIdWithGlobals: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
});

export const agreementTemplateResponseSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  type: z.nativeEnum(AgreementTemplateType),
  purpose: z.string().nullable(),
  description: z.string().nullable(),
  link: z.string().nullable(),
  level: z.number(),
  valueStream: z.object({
    id: z.string().uuid(),
    name: z.string(),
    code: z.string(),
  }).nullable(),
  agent: z.object({
    id: z.string().uuid(),
    name: z.string(),
    type: z.nativeEnum(AgentType),
  }).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateAgreementTemplateInput = z.infer<typeof createAgreementTemplateSchema>;
export type UpdateAgreementTemplateInput = z.infer<typeof updateAgreementTemplateSchema>;
export type MoveAgreementTemplateInput = z.infer<typeof moveAgreementTemplateSchema>;
export type AgreementTemplateResponse = z.infer<typeof agreementTemplateResponseSchema>;
export type AgreementTemplateSearchQuery = z.infer<typeof agreementTemplateSearchQuerySchema>;

export interface AgreementTemplateTreeNode {
  id: string;
  code: string;
  name: string;
  type: AgreementTemplateType;
  purpose: string | null;
  description: string | null;
  link: string | null;
  level: number;
  valueStream: { id: string; name: string; code: string } | null;
  agent: { id: string; name: string; type: AgentType } | null;
  createdAt: string;
  updatedAt: string;
  children: AgreementTemplateTreeNode[];
}
