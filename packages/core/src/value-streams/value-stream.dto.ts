import { createZodDto } from 'nestjs-zod';
import {
  createValueStreamSchema,
  updateValueStreamSchema,
  moveValueStreamSchema,
  valueStreamResponseSchema,
} from '@marketlum/shared';

export class CreateValueStreamDto extends createZodDto(createValueStreamSchema as never) {}
export class UpdateValueStreamDto extends createZodDto(updateValueStreamSchema as never) {}
export class MoveValueStreamDto extends createZodDto(moveValueStreamSchema as never) {}
export class ValueStreamResponseDto extends createZodDto(valueStreamResponseSchema as never) {}
