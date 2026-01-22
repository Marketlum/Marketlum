import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AgreementCategory, AgreementGateway } from '../../agreements/entities/agreement.entity';

export class CreateAgreementFromExchangeDto {
  @ApiProperty({ description: 'Agreement title', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Agreement category', enum: AgreementCategory })
  @IsEnum(AgreementCategory)
  category: AgreementCategory;

  @ApiProperty({ description: 'Agreement gateway', enum: AgreementGateway })
  @IsEnum(AgreementGateway)
  gateway: AgreementGateway;

  @ApiProperty({ description: 'Link to agreement', required: false })
  @IsOptional()
  @IsUrl()
  link?: string;

  @ApiProperty({ description: 'Agreement content', required: false })
  @IsOptional()
  @IsString()
  content?: string;
}
