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
import {
  ApiTags,
  ApiOperation,
  ApiCookieAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { PipelinesService } from './pipelines.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import {
  createPipelineSchema,
  updatePipelineSchema,
  paginationQuerySchema,
  CreatePipelineInput,
  UpdatePipelineInput,
  PaginationQuery,
} from '@marketlum/shared';
import {
  CreatePipelineDto,
  UpdatePipelineDto,
  PipelineResponseDto,
} from './pipeline.dto';

@ApiTags('pipelines')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(PipelineResponseDto)
@Controller('pipelines')
@UseGuards(AdminGuard)
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a pipeline' })
  @ApiBody({ type: CreatePipelineDto })
  @ApiCreatedResponse({ type: PipelineResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body(new ZodValidationPipe(createPipelineSchema)) body: CreatePipelineInput,
  ) {
    return this.pipelinesService.create(body);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search and paginate pipelines' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'valueStreamId', required: false, type: String })
  @ApiPaginatedResponse(PipelineResponseDto)
  async search(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('valueStreamId') valueStreamId?: string,
  ) {
    return this.pipelinesService.search({ ...query, valueStreamId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a pipeline by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Pipeline UUID' })
  @ApiOkResponse({ type: PipelineResponseDto })
  @ApiNotFoundResponse({ description: 'Pipeline not found' })
  async findOne(@Param('id') id: string) {
    return this.pipelinesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a pipeline' })
  @ApiParam({ name: 'id', type: String, description: 'Pipeline UUID' })
  @ApiBody({ type: UpdatePipelineDto })
  @ApiOkResponse({ type: PipelineResponseDto })
  @ApiNotFoundResponse({ description: 'Pipeline not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePipelineSchema)) body: UpdatePipelineInput,
  ) {
    return this.pipelinesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a pipeline' })
  @ApiParam({ name: 'id', type: String, description: 'Pipeline UUID' })
  @ApiNoContentResponse({ description: 'Pipeline deleted' })
  @ApiNotFoundResponse({ description: 'Pipeline not found' })
  async remove(@Param('id') id: string) {
    await this.pipelinesService.remove(id);
  }
}
