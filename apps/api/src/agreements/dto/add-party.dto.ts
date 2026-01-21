import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { AgreementPartyRole } from '../entities/agreement-party.entity';

export class AddPartyDto {
  @ApiProperty({ description: 'Agent ID to add as party' })
  @IsUUID()
  agentId: string;

  @ApiProperty({ description: 'Role of the party', required: false })
  @IsOptional()
  @IsEnum(AgreementPartyRole)
  role?: AgreementPartyRole;
}
