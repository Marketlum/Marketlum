import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsUUID,
} from 'class-validator';

export class CreateValueStreamDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    purpose: string;

    @IsOptional()
    @IsString()
    parentId: string;

    @IsOptional()
    @IsUUID()
    imageId?: string;
}
