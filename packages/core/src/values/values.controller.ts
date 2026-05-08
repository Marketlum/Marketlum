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
import { ValuesService } from './values.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
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
import { CreateValueDto, UpdateValueDto, ValueResponseDto } from './value.dto';

@ApiTags('values')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(ValueResponseDto)
@Controller('values')
@UseGuards(AdminGuard)
export class ValuesController {
  constructor(private readonly valuesService: ValuesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a value' })
  @ApiBody({ type: CreateValueDto })
  @ApiCreatedResponse({ type: ValueResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body(new ZodValidationPipe(createValueSchema)) body: CreateValueInput,
  ) {
    return this.valuesService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'List and paginate values' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'type', required: false, enum: ValueType })
  @ApiQuery({ name: 'taxonomyId', required: false, type: String })
  @ApiQuery({ name: 'agentId', required: false, type: String })
  @ApiQuery({ name: 'valueStreamId', required: false, type: String })
  @ApiQuery({ name: 'lifecycleStage', required: false, enum: ValueLifecycleStage })
  @ApiPaginatedResponse(ValueResponseDto)
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
  @ApiOperation({ summary: 'Get a value by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Value UUID' })
  @ApiOkResponse({ type: ValueResponseDto })
  @ApiNotFoundResponse({ description: 'Value not found' })
  async findOne(@Param('id') id: string) {
    return this.valuesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a value' })
  @ApiParam({ name: 'id', type: String, description: 'Value UUID' })
  @ApiBody({ type: UpdateValueDto })
  @ApiOkResponse({ type: ValueResponseDto })
  @ApiNotFoundResponse({ description: 'Value not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateValueSchema)) body: UpdateValueInput,
  ) {
    return this.valuesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a value' })
  @ApiParam({ name: 'id', type: String, description: 'Value UUID' })
  @ApiNoContentResponse({ description: 'Value deleted' })
  @ApiNotFoundResponse({ description: 'Value not found' })
  async remove(@Param('id') id: string) {
    await this.valuesService.remove(id);
  }
}
