import {
  IsString,
  IsOptional,
  IsUUID,
  IsUrl,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOfferingDto {
  @ApiProperty({ description: 'The name of the offering', required: false, minLength: 2, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiProperty({ description: 'Description of the offering', required: false, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ description: 'Purpose of the offering', required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  purpose?: string;

  @ApiProperty({ description: 'External link for the offering', required: false })
  @IsOptional()
  @IsUrl()
  link?: string;

  @ApiProperty({ description: 'The ID of the agent who owns this offering', required: false })
  @IsOptional()
  @IsUUID()
  agentId?: string;

  @ApiProperty({ description: 'The ID of the value stream this offering belongs to', required: false })
  @IsOptional()
  @IsUUID()
  valueStreamId?: string;

  @ApiProperty({ description: 'Date when the offering becomes active', required: false })
  @IsOptional()
  @IsDateString()
  activeFrom?: string;

  @ApiProperty({ description: 'Date when the offering expires', required: false })
  @IsOptional()
  @IsDateString()
  activeUntil?: string;
}
