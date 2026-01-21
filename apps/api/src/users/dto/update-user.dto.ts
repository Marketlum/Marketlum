import {
    IsString,
    IsEmail,
    IsBoolean,
    IsOptional,
    IsUUID,
    IsDateString,
} from 'class-validator';

export class UpdateUserDto {
    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsUUID()
    avatarFileId?: string | null;

    @IsOptional()
    @IsUUID()
    agentId?: string;

    @IsOptional()
    @IsUUID()
    relationshipAgreementId?: string | null;

    @IsOptional()
    @IsDateString()
    birthday?: string | null;

    @IsOptional()
    @IsDateString()
    joinedAt?: string | null;

    @IsOptional()
    @IsDateString()
    leftAt?: string | null;

    @IsOptional()
    @IsUUID()
    defaultLocaleId?: string;
}
