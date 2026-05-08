import { createZodDto } from 'nestjs-zod';
import {
  createExchangeSchema,
  updateExchangeSchema,
  transitionExchangeSchema,
  exchangeResponseSchema,
  createExchangeFlowSchema,
  updateExchangeFlowSchema,
  exchangeFlowResponseSchema,
} from '@marketlum/shared';

export class CreateExchangeDto extends createZodDto(createExchangeSchema as never) {}
export class UpdateExchangeDto extends createZodDto(updateExchangeSchema as never) {}
export class TransitionExchangeDto extends createZodDto(transitionExchangeSchema as never) {}
export class ExchangeResponseDto extends createZodDto(exchangeResponseSchema as never) {}
export class CreateExchangeFlowDto extends createZodDto(createExchangeFlowSchema as never) {}
export class UpdateExchangeFlowDto extends createZodDto(updateExchangeFlowSchema as never) {}
export class ExchangeFlowResponseDto extends createZodDto(exchangeFlowResponseSchema as never) {}
