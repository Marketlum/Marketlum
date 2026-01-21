import { IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResizeImageDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @ApiProperty({ description: 'Target width', required: false })
  width?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @ApiProperty({ description: 'Target height', required: false })
  height?: number;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ description: 'Keep aspect ratio', default: true, required: false })
  keepAspectRatio?: boolean;
}
