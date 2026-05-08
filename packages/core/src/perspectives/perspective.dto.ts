import { createZodDto } from 'nestjs-zod';
import {
  createPerspectiveSchema,
  updatePerspectiveSchema,
  perspectiveResponseSchema,
} from '@marketlum/shared';

export class CreatePerspectiveDto extends createZodDto(createPerspectiveSchema as never) {}
export class UpdatePerspectiveDto extends createZodDto(updatePerspectiveSchema as never) {}
export class PerspectiveResponseDto extends createZodDto(perspectiveResponseSchema as never) {}
