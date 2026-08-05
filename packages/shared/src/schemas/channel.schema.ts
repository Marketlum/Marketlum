import { z } from 'zod';
import { ActorType } from '../enums/actor-type.enum';
import { codeSchema } from './code.schema';

const actorSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(ActorType),
});

export const createChannelSchema = z.object({
  code: codeSchema,
  name: z.string().min(1),
  purpose: z.string().optional(),
  color: z.string().min(1),
  actorId: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().optional(),
});

export const updateChannelSchema = z.object({
  name: z.string().min(1).optional(),
  purpose: z.string().nullable().optional(),
  color: z.string().min(1).optional(),
  actorId: z.string().uuid().nullable().optional(),
});

export const moveChannelSchema = z.object({
  parentId: z.string().uuid().nullable(),
});

export const channelResponseSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  purpose: z.string().nullable(),
  color: z.string(),
  level: z.number(),
  actor: actorSummarySchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;
export type MoveChannelInput = z.infer<typeof moveChannelSchema>;
export type ChannelResponse = z.infer<typeof channelResponseSchema>;

export interface ChannelTreeNode {
  id: string;
  code: string;
  name: string;
  purpose: string | null;
  color: string;
  level: number;
  actor: { id: string; name: string; type: ActorType } | null;
  createdAt: string;
  updatedAt: string;
  children: ChannelTreeNode[];
}
