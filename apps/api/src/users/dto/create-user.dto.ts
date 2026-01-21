import {
    IsNotEmpty,
    IsString,
    IsEmail,
    IsBoolean,
    IsOptional,
    IsUUID,
    IsDateString,
    MinLength,
    MaxLength,
} from 'class-validator';

export class CreateUserDto {
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    @MaxLength(128)
    password: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsUUID()
    avatarFileId?: string;

    @IsNotEmpty()
    @IsUUID()
    agentId: string;

    @IsOptional()
    @IsUUID()
    relationshipAgreementId?: string;

    @IsOptional()
    @IsDateString()
    birthday?: string;

    @IsOptional()
    @IsDateString()
    joinedAt?: string;

    @IsOptional()
    @IsDateString()
    leftAt?: string;

    @IsNotEmpty()
    @IsUUID()
    defaultLocaleId: string;
}
