import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFlowDto {
  @ApiProperty({ description: 'From Party Agent ID', required: false })
  @IsOptional()
  @IsUUID()
  fromPartyAgentId?: string;

  @ApiProperty({ description: 'To Party Agent ID', required: false })
  @IsOptional()
  @IsUUID()
  toPartyAgentId?: string;

  @ApiProperty({ description: 'Value ID', required: false })
  @IsOptional()
  @IsUUID()
  valueId?: string;

  @ApiProperty({ description: 'Quantity', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number | null;

  @ApiProperty({ description: 'Note', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string | null;
}
