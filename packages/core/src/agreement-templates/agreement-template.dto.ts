import { createZodDto } from 'nestjs-zod';
import {
  createAgreementTemplateSchema,
  updateAgreementTemplateSchema,
  moveAgreementTemplateSchema,
  agreementTemplateResponseSchema,
} from '@marketlum/shared';

export class CreateAgreementTemplateDto extends createZodDto(createAgreementTemplateSchema as never) {}
export class UpdateAgreementTemplateDto extends createZodDto(updateAgreementTemplateSchema as never) {}
export class MoveAgreementTemplateDto extends createZodDto(moveAgreementTemplateSchema as never) {}
export class AgreementTemplateResponseDto extends createZodDto(agreementTemplateResponseSchema as never) {}
