"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentResponseSchema = exports.updateAgentSchema = exports.createAgentSchema = void 0;
const zod_1 = require("zod");
const agent_type_enum_1 = require("../enums/agent-type.enum");
exports.createAgentSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    type: zod_1.z.nativeEnum(agent_type_enum_1.AgentType),
    description: zod_1.z.string().optional(),
});
exports.updateAgentSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    type: zod_1.z.nativeEnum(agent_type_enum_1.AgentType).optional(),
    description: zod_1.z.string().optional(),
});
exports.agentResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    type: zod_1.z.nativeEnum(agent_type_enum_1.AgentType),
    description: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
//# sourceMappingURL=agent.schema.js.map