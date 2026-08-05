import { z } from 'zod';
import { ActorType } from '../enums/actor-type.enum';
import { codeSchema } from './code.schema';

const valueSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
});

const actorSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(ActorType),
});

const fileSummarySchema = z.object({
  id: z.string().uuid(),
  originalName: z.string(),
  storedName: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

export const createValueInstanceSchema = z.object({
  code: codeSchema,
  name: z.string().min(1),
  purpose: z.string().optional(),
  description: z.string().optional(),
  link: z.string().optional(),
  version: z.string().optional(),
  expiresAt: z.string().nullable().optional(),
  valueId: z.string().uuid(),
  fromActorId: z.string().uuid().nullable().optional(),
  toActorId: z.string().uuid().nullable().optional(),
  imageId: z.string().uuid().nullable().optional(),
});

export const updateValueInstanceSchema = z.object({
  name: z.string().min(1).optional(),
  purpose: z.string().optional(),
  description: z.string().optional(),
  link: z.string().optional(),
  version: z.string().optional(),
  expiresAt: z.string().nullable().optional(),
  valueId: z.string().uuid().optional(),
  fromActorId: z.string().uuid().nullable().optional(),
  toActorId: z.string().uuid().nullable().optional(),
  imageId: z.string().uuid().nullable().optional(),
});

export const valueInstanceResponseSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  purpose: z.string().nullable(),
  description: z.string().nullable(),
  link: z.string().nullable(),
  version: z.string().nullable(),
  expiresAt: z.string().nullable(),
  value: valueSummarySchema,
  fromActor: actorSummarySchema.nullable(),
  toActor: actorSummarySchema.nullable(),
  image: fileSummarySchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateValueInstanceInput = z.infer<typeof createValueInstanceSchema>;
export type UpdateValueInstanceInput = z.infer<typeof updateValueInstanceSchema>;
export type ValueInstanceResponse = z.infer<typeof valueInstanceResponseSchema>;
