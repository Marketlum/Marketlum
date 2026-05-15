import { z } from 'zod';

export const CODE_PATTERN = /^[a-z][a-z0-9_]*$/;

export const codeSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(CODE_PATTERN, {
    message:
      'must be snake_case: lowercase letters, digits, underscores; starts with a letter',
  });
