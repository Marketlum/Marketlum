import { createZodDto } from 'nestjs-zod';
import {
  updatePresentationCurrencySchema,
  systemSettingsPresentationCurrencyResponseSchema,
} from '@marketlum/shared';

export class UpdatePresentationCurrencyDto extends createZodDto(
  updatePresentationCurrencySchema as never,
) {}
export class SystemSettingsPresentationCurrencyResponseDto extends createZodDto(
  systemSettingsPresentationCurrencyResponseSchema as never,
) {}
