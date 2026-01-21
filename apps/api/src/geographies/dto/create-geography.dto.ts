import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

import { GeographyLevel } from '../entities/geography.entity';

export class CreateGeographyDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  @Transform(({ value }) => value?.trim().toUpperCase())
  code: string;

  @IsNotEmpty()
  @IsEnum(GeographyLevel)
  level: GeographyLevel;

  @IsOptional()
  @IsString()
  parentId?: string;
}
