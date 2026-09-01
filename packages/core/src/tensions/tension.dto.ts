import { createZodDto } from 'nestjs-zod';
import {
  createTensionSchema,
  renameTensionSchema,
  rescoreTensionSchema,
  reviseTensionContextSchema,
  assignTensionLeadSchema,
  reassignTensionSchema,
  tensionResponseSchema,
  tensionHistoryEntrySchema,
} from '@marketlum/shared';

export class CreateTensionDto extends createZodDto(createTensionSchema as never) {}
export class RenameTensionDto extends createZodDto(renameTensionSchema as never) {}
export class RescoreTensionDto extends createZodDto(rescoreTensionSchema as never) {}
export class ReviseTensionContextDto extends createZodDto(reviseTensionContextSchema as never) {}
export class AssignTensionLeadDto extends createZodDto(assignTensionLeadSchema as never) {}
export class ReassignTensionDto extends createZodDto(reassignTensionSchema as never) {}
export class TensionResponseDto extends createZodDto(tensionResponseSchema as never) {}
export class TensionHistoryEntryDto extends createZodDto(tensionHistoryEntrySchema as never) {}
