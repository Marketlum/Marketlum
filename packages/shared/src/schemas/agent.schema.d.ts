import { z } from 'zod';
import { AgentType } from '../enums/agent-type.enum';
export declare const createAgentSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodNativeEnum<typeof AgentType>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: AgentType;
    name: string;
    description?: string | undefined;
}, {
    type: AgentType;
    name: string;
    description?: string | undefined;
}>;
export declare const updateAgentSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodNativeEnum<typeof AgentType>>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type?: AgentType | undefined;
    name?: string | undefined;
    description?: string | undefined;
}, {
    type?: AgentType | undefined;
    name?: string | undefined;
    description?: string | undefined;
}>;
export declare const agentResponseSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodNativeEnum<typeof AgentType>;
    description: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: AgentType;
    name: string;
    id: string;
    createdAt: string;
    updatedAt: string;
    description: string | null;
}, {
    type: AgentType;
    name: string;
    id: string;
    createdAt: string;
    updatedAt: string;
    description: string | null;
}>;
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type AgentResponse = z.infer<typeof agentResponseSchema>;
//# sourceMappingURL=agent.schema.d.ts.map