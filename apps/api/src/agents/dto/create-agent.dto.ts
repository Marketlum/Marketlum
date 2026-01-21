import {
    IsNotEmpty,
    IsString,
    IsEnum,
    IsOptional,
    IsUUID,
} from 'class-validator';

import { AgentType } from '../entities/agent.entity';

export class CreateAgentDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsEnum(AgentType)
    type: AgentType;

    @IsOptional()
    @IsUUID()
    geographyId?: string;
}
