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
import { ValueStreamsService } from './value-streams.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import {
  createValueStreamSchema,
  updateValueStreamSchema,
  moveValueStreamSchema,
  paginationQuerySchema,
  CreateValueStreamInput,
  UpdateValueStreamInput,
  MoveValueStreamInput,
  PaginationQuery,
} from '@marketlum/shared';
import {
  CreateValueStreamDto,
  UpdateValueStreamDto,
  MoveValueStreamDto,
  ValueStreamResponseDto,
} from './value-stream.dto';

@ApiTags('value-streams')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(ValueStreamResponseDto)
@Controller('value-streams')
@UseGuards(AdminGuard)
export class ValueStreamsController {
  constructor(private readonly valueStreamsService: ValueStreamsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a value stream node' })
  @ApiBody({ type: CreateValueStreamDto })
  @ApiCreatedResponse({ type: ValueStreamResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body(new ZodValidationPipe(createValueStreamSchema)) body: CreateValueStreamInput,
  ) {
    return this.valueStreamsService.create(body);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search and paginate value streams' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiPaginatedResponse(ValueStreamResponseDto)
  async search(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
  ) {
    return this.valueStreamsService.search(query);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Full value stream tree' })
  async findTree() {
    return this.valueStreamsService.findTree();
  }

  @Get('roots')
  @ApiOperation({ summary: 'Top-level value streams' })
  @ApiOkResponse({ type: ValueStreamResponseDto, isArray: true })
  async findRoots() {
    return this.valueStreamsService.findRoots();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a value stream by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Value stream UUID' })
  @ApiOkResponse({ type: ValueStreamResponseDto })
  @ApiNotFoundResponse({ description: 'Value stream not found' })
  async findOne(@Param('id') id: string) {
    return this.valueStreamsService.findOne(id);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Direct children of a value stream' })
  @ApiParam({ name: 'id', type: String, description: 'Value stream UUID' })
  @ApiOkResponse({ type: ValueStreamResponseDto, isArray: true })
  async findChildren(@Param('id') id: string) {
    return this.valueStreamsService.findChildren(id);
  }

  @Get(':id/descendants')
  @ApiOperation({ summary: 'Descendant tree rooted at a value stream' })
  @ApiParam({ name: 'id', type: String, description: 'Value stream UUID' })
  async findDescendantsTree(@Param('id') id: string) {
    return this.valueStreamsService.findDescendantsTree(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a value stream' })
  @ApiParam({ name: 'id', type: String, description: 'Value stream UUID' })
  @ApiBody({ type: UpdateValueStreamDto })
  @ApiOkResponse({ type: ValueStreamResponseDto })
  @ApiNotFoundResponse({ description: 'Value stream not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateValueStreamSchema)) body: UpdateValueStreamInput,
  ) {
    return this.valueStreamsService.update(id, body);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: 'Move a value stream under a different parent' })
  @ApiParam({ name: 'id', type: String, description: 'Value stream UUID' })
  @ApiBody({ type: MoveValueStreamDto })
  @ApiOkResponse({ type: ValueStreamResponseDto })
  @ApiNotFoundResponse({ description: 'Value stream not found' })
  async move(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moveValueStreamSchema)) body: MoveValueStreamInput,
  ) {
    return this.valueStreamsService.move(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a value stream' })
  @ApiParam({ name: 'id', type: String, description: 'Value stream UUID' })
  @ApiNoContentResponse({ description: 'Value stream deleted' })
  @ApiNotFoundResponse({ description: 'Value stream not found' })
  async remove(@Param('id') id: string) {
    await this.valueStreamsService.remove(id);
  }
}
