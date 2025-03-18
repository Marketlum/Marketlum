import {
    IsNotEmpty,
    IsString,
    IsOptional,
} from 'class-validator';

export class CreateTaxonomyDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsString()
    description: string;

    @IsOptional()
    @IsString()
    link: string;

    @IsOptional()
    @IsString()
    parentId: string;
}
