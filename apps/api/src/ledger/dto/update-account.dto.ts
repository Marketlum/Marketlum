import {
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAccountDto {
  @ApiProperty({ description: 'The name of the account', required: false, minLength: 2, maxLength: 160 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @ApiProperty({ description: 'Optional description of the account', required: false, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  // Note: ownerAgentId is intentionally not updatable - once an account is created, its owner cannot change

  @ApiProperty({ description: 'The ID of the value tracked by this account', required: false })
  @IsOptional()
  @IsUUID()
  valueId?: string;
}
