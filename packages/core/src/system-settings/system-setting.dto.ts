import { createZodDto } from 'nestjs-zod';
import {
  updateBaseValueSchema,
  systemSettingsBaseValueResponseSchema,
} from '@marketlum/shared';

export class UpdateBaseValueDto extends createZodDto(updateBaseValueSchema as never) {}
export class SystemSettingsBaseValueResponseDto extends createZodDto(
  systemSettingsBaseValueResponseSchema as never,
) {}
