import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ValueInstanceDirection, ValueInstanceVisibility } from '../entities/value-instance.entity';

export class CreateValueInstanceDto {
  @ApiProperty({ description: 'Value ID' })
  @IsUUID()
  valueId: string;

  @ApiProperty({ description: 'Instance name', minLength: 2, maxLength: 200 })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'Instance purpose', maxLength: 500, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  purpose?: string;

  @ApiProperty({ description: 'Version string', required: false, default: '1.0' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  version?: string;

  @ApiProperty({ description: 'Direction of value flow', enum: ValueInstanceDirection })
  @IsEnum(ValueInstanceDirection)
  direction: ValueInstanceDirection;

  @ApiProperty({ description: 'From Agent ID', required: false })
  @IsOptional()
  @IsUUID()
  fromAgentId?: string;

  @ApiProperty({ description: 'To Agent ID', required: false })
  @IsOptional()
  @IsUUID()
  toAgentId?: string;

  @ApiProperty({ description: 'Parent instance ID', required: false })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty({ description: 'External link URL', required: false })
  @IsOptional()
  @IsUrl()
  link?: string;

  @ApiProperty({ description: 'Image file ID', required: false })
  @IsOptional()
  @IsUUID()
  imageFileId?: string;

  @ApiProperty({ description: 'Visibility setting', enum: ValueInstanceVisibility, required: false, default: 'private' })
  @IsOptional()
  @IsEnum(ValueInstanceVisibility)
  visibility?: ValueInstanceVisibility;
}
