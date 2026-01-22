import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  Min,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateInvoiceItemDto {
  @ApiProperty({ description: 'Value ID (XOR with valueInstanceId)', required: false })
  @ValidateIf((o) => !o.valueInstanceId)
  @IsUUID()
  valueId?: string;

  @ApiProperty({ description: 'Value Instance ID (XOR with valueId)', required: false })
  @ValidateIf((o) => !o.valueId)
  @IsUUID()
  valueInstanceId?: string;

  @ApiProperty({ description: 'Quantity', minimum: 0 })
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @ApiProperty({ description: 'Item description', maxLength: 500, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
