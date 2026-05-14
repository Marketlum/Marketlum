import { z } from 'zod';
import { GeographyType } from '../enums/geography-type.enum';

export const createGeographySchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  type: z.nativeEnum(GeographyType),
  parentId: z.string().uuid().optional(),
});

export const updateGeographySchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
});

export const moveGeographySchema = z.object({
  parentId: z.string().uuid().nullable(),
});

export const listGeographiesQuerySchema = z.object({
  type: z.nativeEnum(GeographyType).optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(500),
});

export const geographyResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  type: z.nativeEnum(GeographyType),
  level: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateGeographyInput = z.infer<typeof createGeographySchema>;
export type UpdateGeographyInput = z.infer<typeof updateGeographySchema>;
export type MoveGeographyInput = z.infer<typeof moveGeographySchema>;
export type ListGeographiesQuery = z.infer<typeof listGeographiesQuerySchema>;
export type GeographyResponse = z.infer<typeof geographyResponseSchema>;

export interface GeographyTreeNode {
  id: string;
  name: string;
  code: string;
  type: GeographyType;
  level: number;
  createdAt: string;
  updatedAt: string;
  children: GeographyTreeNode[];
}
