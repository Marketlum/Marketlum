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
import { ValueInstancesService } from './value-instances.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import {
  createValueInstanceSchema,
  updateValueInstanceSchema,
  paginationQuerySchema,
  CreateValueInstanceInput,
  UpdateValueInstanceInput,
  PaginationQuery,
} from '@marketlum/shared';
import {
  CreateValueInstanceDto,
  UpdateValueInstanceDto,
  ValueInstanceResponseDto,
} from './value-instance.dto';

@ApiTags('value-instances')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(ValueInstanceResponseDto)
@Controller('value-instances')
@UseGuards(AdminGuard)
export class ValueInstancesController {
  constructor(private readonly valueInstancesService: ValueInstancesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a value instance' })
  @ApiBody({ type: CreateValueInstanceDto })
  @ApiCreatedResponse({ type: ValueInstanceResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body(new ZodValidationPipe(createValueInstanceSchema)) body: CreateValueInstanceInput,
  ) {
    return this.valueInstancesService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'List and paginate value instances' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'valueId', required: false, type: String })
  @ApiQuery({ name: 'fromAgentId', required: false, type: String })
  @ApiQuery({ name: 'toAgentId', required: false, type: String })
  @ApiPaginatedResponse(ValueInstanceResponseDto)
  async findAll(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('valueId') valueId?: string,
    @Query('fromAgentId') fromAgentId?: string,
    @Query('toAgentId') toAgentId?: string,
  ) {
    return this.valueInstancesService.findAll({ ...query, valueId, fromAgentId, toAgentId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a value instance by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Value instance UUID' })
  @ApiOkResponse({ type: ValueInstanceResponseDto })
  @ApiNotFoundResponse({ description: 'Value instance not found' })
  async findOne(@Param('id') id: string) {
    return this.valueInstancesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a value instance' })
  @ApiParam({ name: 'id', type: String, description: 'Value instance UUID' })
  @ApiBody({ type: UpdateValueInstanceDto })
  @ApiOkResponse({ type: ValueInstanceResponseDto })
  @ApiNotFoundResponse({ description: 'Value instance not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateValueInstanceSchema)) body: UpdateValueInstanceInput,
  ) {
    return this.valueInstancesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a value instance' })
  @ApiParam({ name: 'id', type: String, description: 'Value instance UUID' })
  @ApiNoContentResponse({ description: 'Value instance deleted' })
  @ApiNotFoundResponse({ description: 'Value instance not found' })
  async remove(@Param('id') id: string) {
    await this.valueInstancesService.remove(id);
  }
}
