import {
  IsString,
  IsOptional,
  IsUUID,
  IsUrl,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOfferingItemDto {
  @ApiProperty({ description: 'The ID of the value to include in this offering' })
  @IsUUID()
  valueId: string;

  @ApiProperty({ description: 'Quantity of the value', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @ApiProperty({ description: 'Pricing formula or description', required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  pricingFormula?: string;

  @ApiProperty({ description: 'Link to pricing details', required: false })
  @IsOptional()
  @IsUrl()
  pricingLink?: string;
}
