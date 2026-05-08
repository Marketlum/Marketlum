import { createZodDto } from 'nestjs-zod';
import {
  createTaxonomySchema,
  updateTaxonomySchema,
  moveTaxonomySchema,
  taxonomyResponseSchema,
} from '@marketlum/shared';

export class CreateTaxonomyDto extends createZodDto(createTaxonomySchema as never) {}
export class UpdateTaxonomyDto extends createZodDto(updateTaxonomySchema as never) {}
export class MoveTaxonomyDto extends createZodDto(moveTaxonomySchema as never) {}
export class TaxonomyResponseDto extends createZodDto(taxonomyResponseSchema as never) {}
