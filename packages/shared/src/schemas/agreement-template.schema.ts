import { z } from 'zod';
import { AgreementTemplateType } from '../enums/agreement-template-type.enum';

export const createAgreementTemplateSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(AgreementTemplateType),
  purpose: z.string().optional(),
  description: z.string().optional(),
  link: z.string().url().optional(),
  parentId: z.string().uuid().optional(),
  valueStreamId: z.string().uuid().optional(),
});

export const updateAgreementTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.nativeEnum(AgreementTemplateType).optional(),
  purpose: z.string().optional(),
  description: z.string().optional(),
  link: z.string().url().optional(),
  valueStreamId: z.string().uuid().nullable().optional(),
});

export const moveAgreementTemplateSchema = z.object({
  parentId: z.string().uuid().nullable(),
});

export const agreementTemplateResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(AgreementTemplateType),
  purpose: z.string().nullable(),
  description: z.string().nullable(),
  link: z.string().nullable(),
  level: z.number(),
  valueStream: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateAgreementTemplateInput = z.infer<typeof createAgreementTemplateSchema>;
export type UpdateAgreementTemplateInput = z.infer<typeof updateAgreementTemplateSchema>;
export type MoveAgreementTemplateInput = z.infer<typeof moveAgreementTemplateSchema>;
export type AgreementTemplateResponse = z.infer<typeof agreementTemplateResponseSchema>;

export interface AgreementTemplateTreeNode {
  id: string;
  name: string;
  type: AgreementTemplateType;
  purpose: string | null;
  description: string | null;
  link: string | null;
  level: number;
  valueStream: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  children: AgreementTemplateTreeNode[];
}
