import { createZodDto } from 'nestjs-zod';
import {
  createValueInstanceSchema,
  updateValueInstanceSchema,
  valueInstanceResponseSchema,
} from '@marketlum/shared';

export class CreateValueInstanceDto extends createZodDto(createValueInstanceSchema as never) {}
export class UpdateValueInstanceDto extends createZodDto(updateValueInstanceSchema as never) {}
export class ValueInstanceResponseDto extends createZodDto(valueInstanceResponseSchema as never) {}
