import {
    IsNotEmpty,
    IsString,
    IsOptional,
} from 'class-validator';

export class CreateValueStreamDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsString()
    purpose: string;

    @IsOptional()
    @IsString()
    parentId: string;
}
