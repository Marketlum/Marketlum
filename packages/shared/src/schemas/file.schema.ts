import { z } from 'zod';

export const updateFileSchema = z.object({
  originalName: z.string().min(1).optional(),
  folderId: z.string().uuid().nullable().optional(),
});

export const fileResponseSchema = z.object({
  id: z.string().uuid(),
  originalName: z.string(),
  storedName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  folderId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const fileQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['ASC', 'DESC']).default('ASC'),
  folderId: z.string().uuid().optional(),
  root: z.coerce.boolean().optional(),
});

export type UpdateFileInput = z.infer<typeof updateFileSchema>;
export type FileResponse = z.infer<typeof fileResponseSchema>;
export type FileQuery = z.infer<typeof fileQuerySchema>;
