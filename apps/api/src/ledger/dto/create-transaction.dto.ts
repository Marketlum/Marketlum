import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsNotIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({ description: 'The ID of the source account' })
  @IsNotEmpty()
  @IsUUID()
  fromAccountId: string;

  @ApiProperty({ description: 'The ID of the destination account' })
  @IsNotEmpty()
  @IsUUID()
  toAccountId: string;

  @ApiProperty({ description: 'The transaction amount (can be positive or negative, must not be 0)' })
  @IsNotEmpty()
  @IsNumber()
  @IsNotIn([0], { message: 'Amount must not be zero' })
  amount: number;

  @ApiProperty({ description: 'The timestamp of the transaction', required: false })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiProperty({ description: 'Whether the transaction is verified', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @ApiProperty({ description: 'Optional note for the transaction', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
