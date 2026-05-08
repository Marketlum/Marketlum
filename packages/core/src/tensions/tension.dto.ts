import { createZodDto } from 'nestjs-zod';
import {
  createTensionSchema,
  updateTensionSchema,
  transitionTensionSchema,
  tensionResponseSchema,
} from '@marketlum/shared';

export class CreateTensionDto extends createZodDto(createTensionSchema as never) {}
export class UpdateTensionDto extends createZodDto(updateTensionSchema as never) {}
export class TransitionTensionDto extends createZodDto(transitionTensionSchema as never) {}
export class TensionResponseDto extends createZodDto(tensionResponseSchema as never) {}
