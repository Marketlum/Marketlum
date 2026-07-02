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

/** Value-stream-centric view of platform membership: "the platform of a value
 * stream" is a single settable property, so PUT/DELETE/GET a singleton. */
@Controller('plugins/rdhy/value-streams/:valueStreamId/platform')
@UseGuards(AdminGuard)
export class AssignmentsController {
  constructor(private readonly platforms: PlatformsService) {}

  @Put()
  async assign(
    @Param('valueStreamId') valueStreamId: string,
    @Body(new ZodValidationPipe(assignRdhyPlatformSchema)) body: AssignRdhyPlatformInput,
  ) {
    return this.platforms.assign(valueStreamId, body);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async detach(@Param('valueStreamId') valueStreamId: string) {
    await this.platforms.detach(valueStreamId);
  }

  @Get()
  async lookup(@Param('valueStreamId') valueStreamId: string) {
    return this.platforms.platformOf(valueStreamId);
  }
}
