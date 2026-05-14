import { createZodDto } from 'nestjs-zod';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  invoiceResponseSchema,
  invoiceImportResponseSchema,
} from '@marketlum/shared';

export class CreateInvoiceDto extends createZodDto(createInvoiceSchema as never) {}
export class UpdateInvoiceDto extends createZodDto(updateInvoiceSchema as never) {}
export class InvoiceResponseDto extends createZodDto(invoiceResponseSchema as never) {}
export class InvoiceImportResponseDto extends createZodDto(invoiceImportResponseSchema as never) {}
