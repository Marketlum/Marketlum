import { createZodDto } from 'nestjs-zod';
import {
  createAgentSchema,
  updateAgentSchema,
  agentResponseSchema,
} from '@marketlum/shared';

export class CreateAgentDto extends createZodDto(createAgentSchema as never) {}
export class UpdateAgentDto extends createZodDto(updateAgentSchema as never) {}
export class AgentResponseDto extends createZodDto(agentResponseSchema as never) {}
