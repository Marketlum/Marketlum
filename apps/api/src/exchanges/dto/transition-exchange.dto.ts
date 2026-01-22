import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ExchangeState } from '../entities/exchange.entity';

export class TransitionExchangeDto {
  @ApiProperty({ description: 'Target state to transition to', enum: ExchangeState })
  @IsEnum(ExchangeState)
  to: ExchangeState;
}
