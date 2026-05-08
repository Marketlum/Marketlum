import { createZodDto } from 'nestjs-zod';
import { createLocaleSchema, localeResponseSchema } from '@marketlum/shared';

export class CreateLocaleDto extends createZodDto(createLocaleSchema as never) {}
export class LocaleResponseDto extends createZodDto(localeResponseSchema as never) {}
