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
import { ValuesService } from './values.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createValueSchema,
  updateValueSchema,
  paginationQuerySchema,
  CreateValueInput,
  UpdateValueInput,
  PaginationQuery,
  ValueType,
  ValueLifecycleStage,
} from '@marketlum/shared';

@Controller('values')
@UseGuards(JwtAuthGuard)
export class ValuesController {
  constructor(private readonly valuesService: ValuesService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(createValueSchema)) body: CreateValueInput,
  ) {
    return this.valuesService.create(body);
  }

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('type') type?: ValueType,
    @Query('taxonomyId') taxonomyId?: string,
    @Query('agentId') agentId?: string,
    @Query('valueStreamId') valueStreamId?: string,
    @Query('lifecycleStage') lifecycleStage?: ValueLifecycleStage,
  ) {
    return this.valuesService.findAll({ ...query, type, taxonomyId, agentId, valueStreamId, lifecycleStage });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.valuesService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateValueSchema)) body: UpdateValueInput,
  ) {
    return this.valuesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.valuesService.remove(id);
  }
}
