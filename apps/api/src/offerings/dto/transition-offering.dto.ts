import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OfferingState } from '../entities/offering.entity';

export class TransitionOfferingDto {
  @ApiProperty({ description: 'The target state to transition to', enum: OfferingState })
  @IsEnum(OfferingState)
  to: OfferingState;
}
