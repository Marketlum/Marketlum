import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PerspectivesService } from './perspectives.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createPerspectiveSchema,
  updatePerspectiveSchema,
  CreatePerspectiveInput,
  UpdatePerspectiveInput,
  TableName,
} from '@marketlum/shared';
import { User } from '../users/entities/user.entity';

@Controller('perspectives')
@UseGuards(AdminGuard)
export class PerspectivesController {
  constructor(private readonly perspectivesService: PerspectivesService) {}

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createPerspectiveSchema)) body: CreatePerspectiveInput,
  ) {
    return this.perspectivesService.create(user.id, body);
  }

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('table') table: TableName,
  ) {
    return this.perspectivesService.findAll(user.id, table);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePerspectiveSchema)) body: UpdatePerspectiveInput,
  ) {
    return this.perspectivesService.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    await this.perspectivesService.remove(user.id, id);
  }
}
