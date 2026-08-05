import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard, ZodValidationPipe } from '@marketlum/core';
import { assignRdhyPlatformSchema, AssignRdhyPlatformInput } from '../shared/schemas';
import { PlatformsService } from './platforms.service';

/** Actor-centric view of platform membership: "the platform of an actor" is
 * a single settable property, so PUT/DELETE/GET a singleton. */
@Controller('plugins/rdhy/actors/:actorId/platform')
@UseGuards(AdminGuard)
export class AssignmentsController {
  constructor(private readonly platforms: PlatformsService) {}

  @Put()
  async assign(
    @Param('actorId') actorId: string,
    @Body(new ZodValidationPipe(assignRdhyPlatformSchema)) body: AssignRdhyPlatformInput,
  ) {
    return this.platforms.assign(actorId, body);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async detach(@Param('actorId') actorId: string) {
    await this.platforms.detach(actorId);
  }

  @Get()
  async lookup(@Param('actorId') actorId: string) {
    return this.platforms.platformOf(actorId);
  }
}
