import { createZodDto } from 'nestjs-zod';
import {
  createApiKeySchema,
  apiKeySummarySchema,
  apiKeyCreatedSchema,
} from '@marketlum/shared';

export class CreateApiKeyDto extends createZodDto(createApiKeySchema as never) {}
export class ApiKeySummaryDto extends createZodDto(apiKeySummarySchema as never) {}
export class ApiKeyCreatedDto extends createZodDto(apiKeyCreatedSchema as never) {}
