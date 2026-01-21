import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CropImageDto {
  @IsNumber()
  @Min(0)
  @ApiProperty({ description: 'X coordinate of crop start' })
  x: number;

  @IsNumber()
  @Min(0)
  @ApiProperty({ description: 'Y coordinate of crop start' })
  y: number;

  @IsNumber()
  @Min(1)
  @ApiProperty({ description: 'Width of crop area' })
  width: number;

  @IsNumber()
  @Min(1)
  @ApiProperty({ description: 'Height of crop area' })
  height: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Output format (png, jpeg, webp)', required: false })
  outputFormat?: string;
}
