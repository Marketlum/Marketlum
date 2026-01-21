import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GrayscaleImageDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Grayscale mode', default: 'grayscale', required: false })
  mode?: string;
}
