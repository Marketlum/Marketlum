import { createZodDto } from 'nestjs-zod';
import {
  createOfferingSchema,
  updateOfferingSchema,
  offeringResponseSchema,
} from '@marketlum/shared';

export class CreateOfferingDto extends createZodDto(createOfferingSchema as never) {}
export class UpdateOfferingDto extends createZodDto(updateOfferingSchema as never) {}
export class OfferingResponseDto extends createZodDto(offeringResponseSchema as never) {}
