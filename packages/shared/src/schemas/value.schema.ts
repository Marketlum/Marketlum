import { z } from 'zod';
import { ValueType } from '../enums/value-type.enum';
import { ValueParentType } from '../enums/value-parent-type.enum';
import { AgentType } from '../enums/agent-type.enum';

const taxonomySummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const fileSummarySchema = z.object({
  id: z.string().uuid(),
  originalName: z.string(),
  storedName: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

const parentSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const agentSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(AgentType),
});

export const createValueSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(ValueType),
  purpose: z.string().optional(),
  description: z.string().optional(),
  link: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
  parentType: z.nativeEnum(ValueParentType).nullable().optional(),
  agentId: z.string().uuid().nullable().optional(),
  mainTaxonomyId: z.string().uuid().nullable().optional(),
  taxonomyIds: z.array(z.string().uuid()).optional(),
  fileIds: z.array(z.string().uuid()).optional(),
});

export const updateValueSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.nativeEnum(ValueType).optional(),
  purpose: z.string().optional(),
  description: z.string().optional(),
  link: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
  parentType: z.nativeEnum(ValueParentType).nullable().optional(),
  agentId: z.string().uuid().nullable().optional(),
  mainTaxonomyId: z.string().uuid().nullable().optional(),
  taxonomyIds: z.array(z.string().uuid()).optional(),
  fileIds: z.array(z.string().uuid()).optional(),
});

export const valueResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(ValueType),
  purpose: z.string().nullable(),
  description: z.string().nullable(),
  link: z.string().nullable(),
  parentType: z.nativeEnum(ValueParentType).nullable(),
  parent: parentSummarySchema.nullable(),
  agent: agentSummarySchema.nullable(),
  mainTaxonomy: taxonomySummarySchema.nullable(),
  taxonomies: z.array(taxonomySummarySchema),
  files: z.array(fileSummarySchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateValueInput = z.infer<typeof createValueSchema>;
export type UpdateValueInput = z.infer<typeof updateValueSchema>;
export type ValueResponse = z.infer<typeof valueResponseSchema>;
