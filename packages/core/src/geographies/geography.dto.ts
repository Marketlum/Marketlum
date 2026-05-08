import { createZodDto } from 'nestjs-zod';
import {
  createGeographySchema,
  updateGeographySchema,
  moveGeographySchema,
  geographyResponseSchema,
} from '@marketlum/shared';

export class CreateGeographyDto extends createZodDto(createGeographySchema as never) {}
export class UpdateGeographyDto extends createZodDto(updateGeographySchema as never) {}
export class MoveGeographyDto extends createZodDto(moveGeographySchema as never) {}
export class GeographyResponseDto extends createZodDto(geographyResponseSchema as never) {}
