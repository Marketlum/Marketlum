import {
    IsNotEmpty,
    IsString,
    IsEnum,
    IsOptional,
    IsUUID,
    IsNumber,
    MaxLength,
    Min,
    Max,
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

    @IsOptional()
    @IsString()
    @MaxLength(255)
    street?: string;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    city?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    postalCode?: string;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    country?: string;

    @IsOptional()
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude?: number;

    @IsOptional()
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude?: number;
}
