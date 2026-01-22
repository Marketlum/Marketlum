import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFlowDto {
  @ApiProperty({ description: 'From Party Agent ID' })
  @IsUUID()
  fromPartyAgentId: string;

  @ApiProperty({ description: 'To Party Agent ID' })
  @IsUUID()
  toPartyAgentId: string;

  @ApiProperty({ description: 'Value ID' })
  @IsUUID()
  valueId: string;

  @ApiProperty({ description: 'Quantity', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiProperty({ description: 'Note', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
