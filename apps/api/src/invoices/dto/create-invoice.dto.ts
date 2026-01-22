import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsUrl,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty({ description: 'From Agent ID' })
  @IsUUID()
  fromAgentId: string;

  @ApiProperty({ description: 'To Agent ID' })
  @IsUUID()
  toAgentId: string;

  @ApiProperty({ description: 'Invoice number', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  number: string;

  @ApiProperty({ description: 'Issue date (YYYY-MM-DD)' })
  @IsDateString()
  issuedAt: string;

  @ApiProperty({ description: 'Due date (YYYY-MM-DD)' })
  @IsDateString()
  dueAt: string;

  @ApiProperty({ description: 'External link URL', required: false })
  @IsOptional()
  @IsUrl()
  link?: string;

  @ApiProperty({ description: 'Attached file ID', required: false })
  @IsOptional()
  @IsUUID()
  fileId?: string;

  @ApiProperty({ description: 'Note', maxLength: 2000, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
