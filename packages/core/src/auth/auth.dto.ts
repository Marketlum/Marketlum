import { createZodDto } from 'nestjs-zod';
import { loginSchema, userResponseSchema } from '@marketlum/shared';

export class LoginDto extends createZodDto(loginSchema as never) {}
export class UserResponseDto extends createZodDto(userResponseSchema as never) {}
