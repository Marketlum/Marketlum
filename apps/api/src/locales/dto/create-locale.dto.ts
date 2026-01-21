import {
    IsNotEmpty,
    IsString,
    MinLength,
    MaxLength,
    Matches,
} from 'class-validator';

export class CreateLocaleDto {
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    @MaxLength(16)
    @Matches(/^[a-zA-Z]+(-[a-zA-Z]+)?$/, {
        message: 'Code must contain only letters and optionally a hyphen (e.g., en, en-US, pl-PL)',
    })
    code: string;
}
