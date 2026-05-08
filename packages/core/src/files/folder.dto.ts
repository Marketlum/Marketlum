import { createZodDto } from 'nestjs-zod';
import {
  createFolderSchema,
  updateFolderSchema,
  moveFolderSchema,
  folderResponseSchema,
} from '@marketlum/shared';

export class CreateFolderDto extends createZodDto(createFolderSchema as never) {}
export class UpdateFolderDto extends createZodDto(updateFolderSchema as never) {}
export class MoveFolderDto extends createZodDto(moveFolderSchema as never) {}
export class FolderResponseDto extends createZodDto(folderResponseSchema as never) {}
