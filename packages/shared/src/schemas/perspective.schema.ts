import { z } from 'zod';
import { TableName } from '../enums/table-name.enum';

export const perspectiveConfigSchema = z.object({
  columnVisibility: z.record(z.string(), z.boolean()).default({}),
  filters: z.record(z.string(), z.string()).default({}),
  sort: z
    .object({
      sortBy: z.string(),
      sortOrder: z.enum(['ASC', 'DESC']),
    })
    .nullable()
    .default(null),
});

export const createPerspectiveSchema = z.object({
  name: z.string().min(1),
  table: z.nativeEnum(TableName),
  isDefault: z.boolean().default(false),
  config: perspectiveConfigSchema.default({}),
});

export const updatePerspectiveSchema = z.object({
  name: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
  config: perspectiveConfigSchema.optional(),
});

export const perspectiveResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  table: z.nativeEnum(TableName),
  isDefault: z.boolean(),
  config: perspectiveConfigSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PerspectiveConfig = z.infer<typeof perspectiveConfigSchema>;
export type CreatePerspectiveInput = z.infer<typeof createPerspectiveSchema>;
export type UpdatePerspectiveInput = z.infer<typeof updatePerspectiveSchema>;
export type PerspectiveResponse = z.infer<typeof perspectiveResponseSchema>;
