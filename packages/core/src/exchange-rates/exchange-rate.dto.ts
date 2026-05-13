import { createZodDto } from 'nestjs-zod';
import {
  createExchangeRateSchema,
  updateExchangeRateSchema,
  exchangeRateQuerySchema,
  exchangeRateResponseSchema,
  exchangeRateLookupQuerySchema,
  exchangeRateLookupResponseSchema,
} from '@marketlum/shared';

export class CreateExchangeRateDto extends createZodDto(
  createExchangeRateSchema as never,
) {}
export class UpdateExchangeRateDto extends createZodDto(
  updateExchangeRateSchema as never,
) {}
export class ExchangeRateQueryDto extends createZodDto(
  exchangeRateQuerySchema as never,
) {}
export class ExchangeRateResponseDto extends createZodDto(
  exchangeRateResponseSchema as never,
) {}
export class ExchangeRateLookupQueryDto extends createZodDto(
  exchangeRateLookupQuerySchema as never,
) {}
export class ExchangeRateLookupResponseDto extends createZodDto(
  exchangeRateLookupResponseSchema as never,
) {}
