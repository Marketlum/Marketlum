import { z } from 'zod';
import { AgentType } from '../enums/agent-type.enum';

const agentSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(AgentType),
});

export const createChannelSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().optional(),
  color: z.string().min(1),
  agentId: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().optional(),
});

export const updateChannelSchema = z.object({
  name: z.string().min(1).optional(),
  purpose: z.string().nullable().optional(),
  color: z.string().min(1).optional(),
  agentId: z.string().uuid().nullable().optional(),
});

export const moveChannelSchema = z.object({
  parentId: z.string().uuid().nullable(),
});

export const channelResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  purpose: z.string().nullable(),
  color: z.string(),
  level: z.number(),
  agent: agentSummarySchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;
export type MoveChannelInput = z.infer<typeof moveChannelSchema>;
export type ChannelResponse = z.infer<typeof channelResponseSchema>;

export interface ChannelTreeNode {
  id: string;
  name: string;
  purpose: string | null;
  color: string;
  level: number;
  agent: { id: string; name: string; type: AgentType } | null;
  createdAt: string;
  updatedAt: string;
  children: ChannelTreeNode[];
}
