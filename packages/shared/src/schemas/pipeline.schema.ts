import { z } from 'zod';

const valueStreamSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export const createPipelineSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().optional(),
  description: z.string().optional(),
  color: z.string().min(1),
  valueStreamId: z.string().uuid().nullable().optional(),
});

export const updatePipelineSchema = z.object({
  name: z.string().min(1).optional(),
  purpose: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  color: z.string().min(1).optional(),
  valueStreamId: z.string().uuid().nullable().optional(),
});

export const pipelineResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  purpose: z.string().nullable(),
  description: z.string().nullable(),
  color: z.string(),
  valueStream: valueStreamSummarySchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const pipelineSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  color: z.string(),
});

export type CreatePipelineInput = z.infer<typeof createPipelineSchema>;
export type UpdatePipelineInput = z.infer<typeof updatePipelineSchema>;
export type PipelineResponse = z.infer<typeof pipelineResponseSchema>;
export type PipelineSummary = z.infer<typeof pipelineSummarySchema>;
