import { createZodDto } from 'nestjs-zod';
import {
  createAccountSchema,
  updateAccountSchema,
  accountResponseSchema,
} from '@marketlum/shared';

export class CreateAccountDto extends createZodDto(createAccountSchema as never) {}
export class UpdateAccountDto extends createZodDto(updateAccountSchema as never) {}
export class AccountResponseDto extends createZodDto(accountResponseSchema as never) {}
