import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsUUID,
} from 'class-validator';

export class CreateTaxonomyDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    link?: string;

    @IsOptional()
    @IsUUID()
    parentId?: string;

    @IsOptional()
    @IsUUID()
    imageId?: string;
}
