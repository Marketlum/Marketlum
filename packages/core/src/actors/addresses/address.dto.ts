import { createZodDto } from 'nestjs-zod';
import {
  createAddressSchema,
  updateAddressSchema,
  addressResponseSchema,
} from '@marketlum/shared';

export class CreateAddressDto extends createZodDto(createAddressSchema as never) {}
export class UpdateAddressDto extends createZodDto(updateAddressSchema as never) {}
export class AddressResponseDto extends createZodDto(addressResponseSchema as never) {}
