import {
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateExchangeDto {
  @ApiProperty({ description: 'Exchange name', minLength: 2, maxLength: 200, required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiProperty({ description: 'Exchange purpose', maxLength: 500, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  purpose?: string | null;

  @ApiProperty({ description: 'Value Stream ID', required: false })
  @IsOptional()
  @IsUUID()
  valueStreamId?: string;

  @ApiProperty({ description: 'Channel ID', required: false })
  @IsOptional()
  @IsUUID()
  channelId?: string | null;

  @ApiProperty({ description: 'Taxon ID', required: false })
  @IsOptional()
  @IsUUID()
  taxonId?: string | null;

  @ApiProperty({ description: 'Agreement ID', required: false })
  @IsOptional()
  @IsUUID()
  agreementId?: string | null;

  @ApiProperty({ description: 'Lead User ID', required: false })
  @IsOptional()
  @IsUUID()
  leadUserId?: string | null;
}
