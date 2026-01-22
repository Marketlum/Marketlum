import {
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
  MaxLength,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExchangeDto {
  @ApiProperty({ description: 'Exchange name', minLength: 2, maxLength: 200 })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'Exchange purpose', maxLength: 500, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  purpose?: string;

  @ApiProperty({ description: 'Value Stream ID' })
  @IsUUID()
  valueStreamId: string;

  @ApiProperty({ description: 'Channel ID', required: false })
  @IsOptional()
  @IsUUID()
  channelId?: string;

  @ApiProperty({ description: 'Taxon ID', required: false })
  @IsOptional()
  @IsUUID()
  taxonId?: string;

  @ApiProperty({ description: 'Agreement ID', required: false })
  @IsOptional()
  @IsUUID()
  agreementId?: string;

  @ApiProperty({ description: 'Lead User ID', required: false })
  @IsOptional()
  @IsUUID()
  leadUserId?: string;

  @ApiProperty({ description: 'Party Agent IDs', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  partyAgentIds?: string[];
}
