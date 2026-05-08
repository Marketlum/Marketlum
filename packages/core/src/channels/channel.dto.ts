import { createZodDto } from 'nestjs-zod';
import {
  createChannelSchema,
  updateChannelSchema,
  moveChannelSchema,
  channelResponseSchema,
} from '@marketlum/shared';

export class CreateChannelDto extends createZodDto(createChannelSchema as never) {}
export class UpdateChannelDto extends createZodDto(updateChannelSchema as never) {}
export class MoveChannelDto extends createZodDto(moveChannelSchema as never) {}
export class ChannelResponseDto extends createZodDto(channelResponseSchema as never) {}
