import { createZodDto } from 'nestjs-zod';
import {
  createAgreementSchema,
  updateAgreementSchema,
  moveAgreementSchema,
  agreementResponseSchema,
} from '@marketlum/shared';

export class CreateAgreementDto extends createZodDto(createAgreementSchema as never) {}
export class UpdateAgreementDto extends createZodDto(updateAgreementSchema as never) {}
export class MoveAgreementDto extends createZodDto(moveAgreementSchema as never) {}
export class AgreementResponseDto extends createZodDto(agreementResponseSchema as never) {}
