import {
  IsString,
  IsOptional,
  IsUrl,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOfferingItemDto {
  @ApiProperty({ description: 'Quantity of the value', required: false })
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
