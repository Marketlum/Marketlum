import { z } from 'zod';
import { ActorType } from '../enums/actor-type.enum';
import { addressResponseSchema } from './address.schema';

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

export const createActorSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(ActorType),
  purpose: z.string().optional(),
  email: z.string().email().nullable().optional(),
  website: z.string().url().nullable().optional(),
  mainTaxonomyId: z.string().uuid().nullable().optional(),
  taxonomyIds: z.array(z.string().uuid()).optional(),
  imageId: z.string().uuid().nullable().optional(),
  // Required at the form layer, optional at the API boundary so seeders and
  // unrelated tests can omit it. Service validates type='currency' when set.
  functionalCurrencyId: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const updateActorSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.nativeEnum(ActorType).optional(),
  purpose: z.string().optional(),
  email: z.string().email().nullable().optional(),
  website: z.string().url().nullable().optional(),
  mainTaxonomyId: z.string().uuid().nullable().optional(),
  taxonomyIds: z.array(z.string().uuid()).optional(),
  imageId: z.string().uuid().nullable().optional(),
  functionalCurrencyId: z.string().uuid().nullable().optional(),
});

/** Re-parenting goes only through PATCH /actors/:id/move; null = make root. */
export const moveActorSchema = z.object({
  parentId: z.string().uuid().nullable(),
});

export const actorResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(ActorType),
  purpose: z.string().nullable(),
  email: z.string().nullable(),
  website: z.string().nullable(),
  mainTaxonomy: taxonomySummarySchema.nullable(),
  taxonomies: z.array(taxonomySummarySchema),
  image: fileSummarySchema.nullable(),
  addresses: z.array(addressResponseSchema).default([]),
  functionalCurrency: valueSummarySchema.nullable(),
  functionalCurrencyId: z.string().uuid().nullable(),
  parentId: z.string().uuid().nullable().default(null),
  level: z.number().default(0),
  parent: actorSummarySchema.nullable().default(null),
  /** Detail endpoint only: path from root down to the direct parent. */
  ancestors: z.array(actorSummarySchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const actorSnapshotReferencesResponseSchema = z.object({
  invoiceItems: z.number().int().nonnegative(),
});

export type CreateActorInput = z.infer<typeof createActorSchema>;
export type UpdateActorInput = z.infer<typeof updateActorSchema>;
export type MoveActorInput = z.infer<typeof moveActorSchema>;
export type ActorResponse = z.infer<typeof actorResponseSchema>;
export type ActorSummary = z.infer<typeof actorSummarySchema>;
export type ActorSnapshotReferencesResponse = z.infer<typeof actorSnapshotReferencesResponseSchema>;

export interface ActorTreeNode {
  id: string;
  name: string;
  type: ActorType;
  level: number;
  image: { id: string; mimeType: string } | null;
  children: ActorTreeNode[];
}
