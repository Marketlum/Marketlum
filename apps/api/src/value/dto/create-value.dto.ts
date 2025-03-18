import {
    IsNotEmpty,
    IsString,
    IsEnum,
    IsOptional,
} from 'class-validator';

import { ValueType, ValueParentType } from '../entities/value.entity';

export class CreateValueDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description: string;

    @IsNotEmpty()
    @IsEnum(ValueParentType)
    parentType: ValueParentType;

    @IsNotEmpty()
    @IsEnum(ValueType)
    type: ValueType;

    @IsOptional()
    @IsString()
    parentId: string;

    @IsOptional()
    @IsString()
    agentId: string;

    @IsOptional()
    @IsString()
    streamId: string;
}
