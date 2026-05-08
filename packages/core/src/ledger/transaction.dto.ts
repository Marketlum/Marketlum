import { createZodDto } from 'nestjs-zod';
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionResponseSchema,
} from '@marketlum/shared';

export class CreateTransactionDto extends createZodDto(createTransactionSchema as never) {}
export class UpdateTransactionDto extends createZodDto(updateTransactionSchema as never) {}
export class TransactionResponseDto extends createZodDto(transactionResponseSchema as never) {}
