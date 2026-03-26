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
import { TensionsService } from './tensions.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createTensionSchema,
  updateTensionSchema,
  paginationQuerySchema,
  CreateTensionInput,
  UpdateTensionInput,
  PaginationQuery,
} from '@marketlum/shared';

@Controller('tensions')
@UseGuards(AdminGuard)
export class TensionsController {
  constructor(private readonly tensionsService: TensionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createTensionSchema)) body: CreateTensionInput,
  ) {
    return this.tensionsService.create(body);
  }

  @Get('search')
  async search(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('agentId') agentId?: string,
    @Query('leadUserId') leadUserId?: string,
  ) {
    return this.tensionsService.search({
      ...query,
      agentId,
      leadUserId,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tensionsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTensionSchema)) body: UpdateTensionInput,
  ) {
    return this.tensionsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.tensionsService.remove(id);
  }
}
