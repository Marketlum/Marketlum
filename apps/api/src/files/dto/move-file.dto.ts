import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MoveFileDto {
  @IsOptional()
  @IsUUID()
  @ApiProperty({ description: 'Folder ID to move file to (null for root)', required: false })
  folderId?: string | null;
}
