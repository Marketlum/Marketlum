import {
  IsString,
  IsOptional,
} from 'class-validator';

export class MoveChannelDto {
  @IsOptional()
  @IsString()
  parentId?: string | null;
}
