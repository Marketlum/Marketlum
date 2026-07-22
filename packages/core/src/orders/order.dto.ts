import { createZodDto } from 'nestjs-zod';
import {
  createOrderSchema,
  updateOrderSchema,
  orderResponseSchema,
} from '@marketlum/shared';

export class CreateOrderDto extends createZodDto(createOrderSchema as never) {}
export class UpdateOrderDto extends createZodDto(updateOrderSchema as never) {}
export class OrderResponseDto extends createZodDto(orderResponseSchema as never) {}
