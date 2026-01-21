import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiProperty({ description: 'The name of the account', minLength: 2, maxLength: 160 })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name: string;

  @ApiProperty({ description: 'Optional description of the account', required: false, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'The ID of the agent that owns this account' })
  @IsNotEmpty()
  @IsUUID()
  ownerAgentId: string;

  @ApiProperty({ description: 'The ID of the value tracked by this account' })
  @IsNotEmpty()
  @IsUUID()
  valueId: string;
}
