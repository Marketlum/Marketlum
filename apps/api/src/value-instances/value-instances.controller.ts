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
import { ValueInstancesService } from './value-instances.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createValueInstanceSchema,
  updateValueInstanceSchema,
  paginationQuerySchema,
  CreateValueInstanceInput,
  UpdateValueInstanceInput,
  PaginationQuery,
} from '@marketlum/shared';

@Controller('value-instances')
@UseGuards(JwtAuthGuard)
export class ValueInstancesController {
  constructor(private readonly valueInstancesService: ValueInstancesService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(createValueInstanceSchema)) body: CreateValueInstanceInput,
  ) {
    return this.valueInstancesService.create(body);
  }

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('valueId') valueId?: string,
    @Query('fromAgentId') fromAgentId?: string,
    @Query('toAgentId') toAgentId?: string,
  ) {
    return this.valueInstancesService.findAll({ ...query, valueId, fromAgentId, toAgentId });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.valueInstancesService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateValueInstanceSchema)) body: UpdateValueInstanceInput,
  ) {
    return this.valueInstancesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.valueInstancesService.remove(id);
  }
}
