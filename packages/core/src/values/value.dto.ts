import { createZodDto } from 'nestjs-zod';
import {
  createValueSchema,
  updateValueSchema,
  valueResponseSchema,
} from '@marketlum/shared';

export class CreateValueDto extends createZodDto(createValueSchema as never) {}
export class UpdateValueDto extends createZodDto(updateValueSchema as never) {}
export class ValueResponseDto extends createZodDto(valueResponseSchema as never) {}
