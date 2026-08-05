import { z } from 'zod';
import { ValueType } from '../enums/value-type.enum';
import { ValueParentType } from '../enums/value-parent-type.enum';
import { ValueLifecycleStage } from '../enums/value-lifecycle-stage.enum';
import { ActorType } from '../enums/actor-type.enum';
import { codeSchema } from './code.schema';

const taxonomySummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
});

const fileSummarySchema = z.object({
  id: z.string().uuid(),
  originalName: z.string(),
  storedName: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

const imageSummarySchema = z.object({
  id: z.string().uuid(),
  originalName: z.string(),
  storedName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  position: z.number(),
});

const parentSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
});

const actorSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(ActorType),
});

const valueStreamSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  image: fileSummarySchema.nullable(),
});

export const createValueSchema = z.object({
  code: codeSchema,
  name: z.string().min(1),
  type: z.nativeEnum(ValueType),
  purpose: z.string().optional(),
  description: z.string().optional(),
  link: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
  parentType: z.nativeEnum(ValueParentType).nullable().optional(),
  actorId: z.string().uuid().nullable().optional(),
  mainTaxonomyId: z.string().uuid().nullable().optional(),
  taxonomyIds: z.array(z.string().uuid()).optional(),
  fileIds: z.array(z.string().uuid()).optional(),
  imageIds: z.array(z.string().uuid()).optional(),
  valueStreamId: z.string().uuid().nullable().optional(),
  abstract: z.boolean().optional(),
  lifecycleStage: z.nativeEnum(ValueLifecycleStage).nullable().optional(),
});

export const updateValueSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.nativeEnum(ValueType).optional(),
  purpose: z.string().optional(),
  description: z.string().optional(),
  link: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
  parentType: z.nativeEnum(ValueParentType).nullable().optional(),
  actorId: z.string().uuid().nullable().optional(),
  mainTaxonomyId: z.string().uuid().nullable().optional(),
  taxonomyIds: z.array(z.string().uuid()).optional(),
  fileIds: z.array(z.string().uuid()).optional(),
  imageIds: z.array(z.string().uuid()).optional(),
  valueStreamId: z.string().uuid().nullable().optional(),
  abstract: z.boolean().optional(),
  lifecycleStage: z.nativeEnum(ValueLifecycleStage).nullable().optional(),
});

export const valueResponseSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  type: z.nativeEnum(ValueType),
  purpose: z.string().nullable(),
  description: z.string().nullable(),
  link: z.string().nullable(),
  abstract: z.boolean(),
  lifecycleStage: z.nativeEnum(ValueLifecycleStage).nullable(),
  parentType: z.nativeEnum(ValueParentType).nullable(),
  parent: parentSummarySchema.nullable(),
  actor: actorSummarySchema.nullable(),
  valueStream: valueStreamSummarySchema.nullable(),
  mainTaxonomy: taxonomySummarySchema.nullable(),
  taxonomies: z.array(taxonomySummarySchema),
  files: z.array(fileSummarySchema),
  images: z.array(imageSummarySchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateValueInput = z.infer<typeof createValueSchema>;
export type UpdateValueInput = z.infer<typeof updateValueSchema>;
export type ValueResponse = z.infer<typeof valueResponseSchema>;
