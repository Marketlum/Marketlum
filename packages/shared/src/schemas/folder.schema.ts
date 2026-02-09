import { z } from 'zod';

export const createFolderSchema = z.object({
  name: z.string().min(1),
  parentId: z.string().uuid().optional(),
});

export const updateFolderSchema = z.object({
  name: z.string().min(1).optional(),
});

export const moveFolderSchema = z.object({
  parentId: z.string().uuid().nullable(),
});

export const folderResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  level: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;
export type MoveFolderInput = z.infer<typeof moveFolderSchema>;
export type FolderResponse = z.infer<typeof folderResponseSchema>;

export interface FolderTreeNode {
  id: string;
  name: string;
  level: number;
  createdAt: string;
  updatedAt: string;
  children: FolderTreeNode[];
}
