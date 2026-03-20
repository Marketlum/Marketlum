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
import { PipelinesService } from './pipelines.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createPipelineSchema,
  updatePipelineSchema,
  paginationQuerySchema,
  CreatePipelineInput,
  UpdatePipelineInput,
  PaginationQuery,
} from '@marketlum/shared';

@Controller('pipelines')
@UseGuards(JwtAuthGuard)
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createPipelineSchema)) body: CreatePipelineInput,
  ) {
    return this.pipelinesService.create(body);
  }

  @Get('search')
  async search(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('valueStreamId') valueStreamId?: string,
  ) {
    return this.pipelinesService.search({ ...query, valueStreamId });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.pipelinesService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePipelineSchema)) body: UpdatePipelineInput,
  ) {
    return this.pipelinesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.pipelinesService.remove(id);
  }
}
