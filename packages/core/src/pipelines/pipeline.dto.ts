import { createZodDto } from 'nestjs-zod';
import {
  createPipelineSchema,
  updatePipelineSchema,
  pipelineResponseSchema,
} from '@marketlum/shared';

export class CreatePipelineDto extends createZodDto(createPipelineSchema as never) {}
export class UpdatePipelineDto extends createZodDto(updatePipelineSchema as never) {}
export class PipelineResponseDto extends createZodDto(pipelineResponseSchema as never) {}
