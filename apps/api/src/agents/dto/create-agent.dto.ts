import {
    IsNotEmpty,
    IsString,
    IsEnum,
    IsOptional,
} from 'class-validator';

import { AgentType } from '../entities/agent.entity';

export class CreateAgentDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsEnum(AgentType)
    type: AgentType;
}
