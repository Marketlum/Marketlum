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
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { TensionsService } from './tensions.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createTensionSchema,
  updateTensionSchema,
  transitionTensionSchema,
  paginationQuerySchema,
  CreateTensionInput,
  UpdateTensionInput,
  TransitionTensionInput,
  PaginationQuery,
} from '@marketlum/shared';
import {
  CreateTensionDto,
  UpdateTensionDto,
  TransitionTensionDto,
  TensionResponseDto,
} from './tension.dto';

@ApiTags('tensions')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@Controller('tensions')
@UseGuards(AdminGuard)
export class TensionsController {
  constructor(private readonly tensionsService: TensionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a tension' })
  @ApiBody({ type: CreateTensionDto })
  @ApiCreatedResponse({ description: 'Tension created', type: TensionResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiNotFoundResponse({ description: 'Referenced agent or lead user not found' })
  async create(
    @Body(new ZodValidationPipe(createTensionSchema)) body: CreateTensionInput,
  ) {
    return this.tensionsService.create(body);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search and paginate tensions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Full-text search query' })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'agentId', required: false, type: String, description: 'UUID of the agent to filter by' })
  @ApiQuery({ name: 'leadUserId', required: false, type: String, description: 'UUID of the lead user to filter by' })
  @ApiQuery({ name: 'state', required: false, enum: ['alive', 'resolved', 'stale'] })
  @ApiOkResponse({
    description: 'Paginated list of tensions',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/TensionResponseDto' } },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
  })
  async search(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('agentId') agentId?: string,
    @Query('leadUserId') leadUserId?: string,
    @Query('state') state?: string,
  ) {
    return this.tensionsService.search({
      ...query,
      agentId,
      leadUserId,
      state,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tension by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: TensionResponseDto })
  @ApiNotFoundResponse({ description: 'Tension not found' })
  async findOne(@Param('id') id: string) {
    return this.tensionsService.findOne(id);
  }

  @Post(':id/transitions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transition a tension between alive / resolved / stale',
    description: 'Allowed: alive↔resolved, alive↔stale. Cross transitions (resolved↔stale) are rejected.',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({ type: TransitionTensionDto })
  @ApiOkResponse({ description: 'Tension after transition', type: TensionResponseDto })
  @ApiBadRequestResponse({ description: 'Transition not allowed from the current state' })
  @ApiNotFoundResponse({ description: 'Tension not found' })
  async transition(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(transitionTensionSchema)) body: TransitionTensionInput,
  ) {
    return this.tensionsService.transition(id, body.action);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tension' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateTensionDto })
  @ApiOkResponse({ type: TensionResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiNotFoundResponse({ description: 'Tension or referenced entity not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTensionSchema)) body: UpdateTensionInput,
  ) {
    return this.tensionsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tension' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiNoContentResponse({ description: 'Tension deleted' })
  @ApiNotFoundResponse({ description: 'Tension not found' })
  async remove(@Param('id') id: string) {
    await this.tensionsService.remove(id);
  }
}
