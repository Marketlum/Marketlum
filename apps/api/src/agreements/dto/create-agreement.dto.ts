import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsUrl,
  IsUUID,
  IsArray,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { AgreementCategory, AgreementGateway } from '../entities/agreement.entity';
import { AgreementPartyRole } from '../entities/agreement-party.entity';

export class PartyInput {
  @ApiProperty({ description: 'Agent ID' })
  @IsUUID()
  agentId: string;

  @ApiProperty({ description: 'Role of the party', required: false })
  @IsOptional()
  @IsEnum(AgreementPartyRole)
  role?: AgreementPartyRole;
}

export class CreateAgreementDto {
  @ApiProperty({ description: 'The title of the agreement' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'The category of the agreement', enum: AgreementCategory })
  @IsEnum(AgreementCategory)
  category: AgreementCategory;

  @ApiProperty({ description: 'The gateway used for the agreement', enum: AgreementGateway })
  @IsEnum(AgreementGateway)
  gateway: AgreementGateway;

  @ApiProperty({ description: 'Optional URL link for the agreement', required: false })
  @IsOptional()
  @IsUrl()
  link?: string;

  @ApiProperty({ description: 'Optional content/notes for the agreement', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  content?: string;

  @ApiProperty({ description: 'Date when the agreement was completed', required: false })
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @ApiProperty({ description: 'Parent agreement ID (for annexes)', required: false })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty({ description: 'Attached file ID', required: false })
  @IsOptional()
  @IsUUID()
  fileId?: string;

  @ApiProperty({ description: 'Parties involved in the agreement', type: [PartyInput], required: false })
  @IsOptional()
  @IsArray()
  parties?: PartyInput[];
}
