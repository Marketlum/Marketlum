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

/** Agent-centric view of platform membership: "the platform of an agent" is
 * a single settable property, so PUT/DELETE/GET a singleton. */
@Controller('plugins/rdhy/agents/:agentId/platform')
@UseGuards(AdminGuard)
export class AssignmentsController {
  constructor(private readonly platforms: PlatformsService) {}

  @Put()
  async assign(
    @Param('agentId') agentId: string,
    @Body(new ZodValidationPipe(assignRdhyPlatformSchema)) body: AssignRdhyPlatformInput,
  ) {
    return this.platforms.assign(agentId, body);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async detach(@Param('agentId') agentId: string) {
    await this.platforms.detach(agentId);
  }

  @Get()
  async lookup(@Param('agentId') agentId: string) {
    return this.platforms.platformOf(agentId);
  }
}
