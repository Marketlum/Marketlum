import { createZodDto } from 'nestjs-zod';
import {
  updateFileSchema,
  fileResponseSchema,
} from '@marketlum/shared';

export class UpdateFileDto extends createZodDto(updateFileSchema as never) {}
export class FileResponseDto extends createZodDto(fileResponseSchema as never) {}
