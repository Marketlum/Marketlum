import { IsString, IsOptional, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFolderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @ApiProperty({ description: 'Folder name', example: 'Documents' })
  name: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty({ description: 'Parent folder ID', required: false })
  parentId?: string;
}
