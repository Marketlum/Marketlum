import {
  IsString,
  IsOptional,
} from 'class-validator';

export class MoveGeographyDto {
  @IsOptional()
  @IsString()
  parentId?: string | null;
}
