import { createZodDto } from 'nestjs-zod';
import {
  createActorSchema,
  updateActorSchema,
  actorResponseSchema,
} from '@marketlum/shared';

export class CreateActorDto extends createZodDto(createActorSchema as never) {}
export class UpdateActorDto extends createZodDto(updateActorSchema as never) {}
export class ActorResponseDto extends createZodDto(actorResponseSchema as never) {}
