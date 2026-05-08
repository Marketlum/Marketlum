import { createZodDto } from 'nestjs-zod';
import {
  createArchetypeSchema,
  updateArchetypeSchema,
  archetypeResponseSchema,
} from '@marketlum/shared';

export class CreateArchetypeDto extends createZodDto(createArchetypeSchema as never) {}
export class UpdateArchetypeDto extends createZodDto(updateArchetypeSchema as never) {}
export class ArchetypeResponseDto extends createZodDto(archetypeResponseSchema as never) {}
