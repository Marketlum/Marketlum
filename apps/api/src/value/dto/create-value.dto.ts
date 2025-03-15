import {
    IsNotEmpty,
    IsString,
    IsEnum,
    IsOptional,
} from 'class-validator';

import { ValueParentType } from '../entities/value.entity';

export class CreateValueDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsString()
    description: string;

    @IsNotEmpty()
    @IsEnum(ValueParentType)
    parentType: ValueParentType;

    @IsOptional()
    @IsString()
    parentId: string;
}
