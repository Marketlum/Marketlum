import { createZodDto } from 'nestjs-zod';
import {
  createRecurringFlowSchema,
  updateRecurringFlowSchema,
  transitionRecurringFlowSchema,
  recurringFlowQuerySchema,
  recurringFlowResponseSchema,
  recurringFlowRollupSchema,
  recurringFlowProjectionSchema,
} from '@marketlum/shared';

export class CreateRecurringFlowDto extends createZodDto(createRecurringFlowSchema as never) {}
export class UpdateRecurringFlowDto extends createZodDto(updateRecurringFlowSchema as never) {}
export class TransitionRecurringFlowDto extends createZodDto(transitionRecurringFlowSchema as never) {}
export class RecurringFlowQueryDto extends createZodDto(recurringFlowQuerySchema as never) {}
export class RecurringFlowResponseDto extends createZodDto(recurringFlowResponseSchema as never) {}
export class RecurringFlowRollupDto extends createZodDto(recurringFlowRollupSchema as never) {}
export class RecurringFlowProjectionDto extends createZodDto(recurringFlowProjectionSchema as never) {}
