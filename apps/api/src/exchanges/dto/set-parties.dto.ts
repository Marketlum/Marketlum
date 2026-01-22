import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetPartiesDto {
  @ApiProperty({ description: 'Party Agent IDs', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  partyAgentIds: string[];
}
