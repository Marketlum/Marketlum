import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard, ZodValidationPipe } from '@marketlum/core';
import {
  createRdhyPlatformSchema,
  updateRdhyPlatformSchema,
  CreateRdhyPlatformInput,
  UpdateRdhyPlatformInput,
} from '../shared/schemas';
import { PlatformsService } from './platforms.service';

@Controller('plugins/rdhy/platforms')
@UseGuards(AdminGuard)
export class PlatformsController {
  constructor(private readonly platforms: PlatformsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createRdhyPlatformSchema)) body: CreateRdhyPlatformInput,
  ) {
    return this.platforms.create(body);
  }

  @Get()
  async findAll() {
    return this.platforms.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.platforms.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRdhyPlatformSchema)) body: UpdateRdhyPlatformInput,
  ) {
    return this.platforms.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.platforms.remove(id);
  }
}
