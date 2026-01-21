import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFileDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({ description: 'Alt text for images', required: false })
  altText?: string | null;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Caption for the file', required: false })
  caption?: string | null;

  @IsOptional()
  @IsUUID()
  @ApiProperty({ description: 'Folder ID to move file to', required: false })
  folderId?: string | null;
}
