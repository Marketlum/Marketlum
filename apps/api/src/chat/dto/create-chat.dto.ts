import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LlmProvider } from '../entities/chat.entity';

export class CreateChatDto {
  @ApiProperty({ description: 'Chat title', maxLength: 200, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({ description: 'LLM provider', enum: LlmProvider, required: false })
  @IsOptional()
  @IsEnum(LlmProvider)
  provider?: LlmProvider;

  @ApiProperty({ description: 'Model identifier', maxLength: 100, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;
}
