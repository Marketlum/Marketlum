import { createZodDto } from 'nestjs-zod';
import {
  createUserSchema,
  updateUserSchema,
  changeUserPasswordSchema,
  userResponseSchema,
} from '@marketlum/shared';

export class CreateUserDto extends createZodDto(createUserSchema as never) {}
export class UpdateUserDto extends createZodDto(updateUserSchema as never) {}
export class ChangeUserPasswordDto extends createZodDto(changeUserPasswordSchema as never) {}
export class UserResponseDto extends createZodDto(userResponseSchema as never) {}
