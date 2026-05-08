import { createZodDto } from 'nestjs-zod';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  invoiceResponseSchema,
} from '@marketlum/shared';

export class CreateInvoiceDto extends createZodDto(createInvoiceSchema as never) {}
export class UpdateInvoiceDto extends createZodDto(updateInvoiceSchema as never) {}
export class InvoiceResponseDto extends createZodDto(invoiceResponseSchema as never) {}
