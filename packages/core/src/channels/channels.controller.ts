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
import { ChannelsService } from './channels.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import {
  createChannelSchema,
  updateChannelSchema,
  moveChannelSchema,
  paginationQuerySchema,
  CreateChannelInput,
  UpdateChannelInput,
  MoveChannelInput,
  PaginationQuery,
} from '@marketlum/shared';
import {
  CreateChannelDto,
  UpdateChannelDto,
  MoveChannelDto,
  ChannelResponseDto,
} from './channel.dto';

@ApiTags('channels')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(ChannelResponseDto)
@Controller('channels')
@UseGuards(AdminGuard)
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a channel' })
  @ApiBody({ type: CreateChannelDto })
  @ApiCreatedResponse({ type: ChannelResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body(new ZodValidationPipe(createChannelSchema)) body: CreateChannelInput,
  ) {
    return this.channelsService.create(body);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search and paginate channels' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'agentId', required: false, type: String })
  @ApiPaginatedResponse(ChannelResponseDto)
  async search(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('agentId') agentId?: string,
  ) {
    return this.channelsService.search({ ...query, agentId });
  }

  @Get('tree')
  @ApiOperation({ summary: 'Full channel tree' })
  async findTree() {
    return this.channelsService.findTree();
  }

  @Get('roots')
  @ApiOperation({ summary: 'Top-level channels' })
  @ApiOkResponse({ type: ChannelResponseDto, isArray: true })
  async findRoots() {
    return this.channelsService.findRoots();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a channel by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Channel UUID' })
  @ApiOkResponse({ type: ChannelResponseDto })
  @ApiNotFoundResponse({ description: 'Channel not found' })
  async findOne(@Param('id') id: string) {
    return this.channelsService.findOne(id);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Direct children of a channel' })
  @ApiParam({ name: 'id', type: String, description: 'Channel UUID' })
  @ApiOkResponse({ type: ChannelResponseDto, isArray: true })
  async findChildren(@Param('id') id: string) {
    return this.channelsService.findChildren(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a channel' })
  @ApiParam({ name: 'id', type: String, description: 'Channel UUID' })
  @ApiBody({ type: UpdateChannelDto })
  @ApiOkResponse({ type: ChannelResponseDto })
  @ApiNotFoundResponse({ description: 'Channel not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateChannelSchema)) body: UpdateChannelInput,
  ) {
    return this.channelsService.update(id, body);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: 'Move a channel under a different parent' })
  @ApiParam({ name: 'id', type: String, description: 'Channel UUID' })
  @ApiBody({ type: MoveChannelDto })
  @ApiOkResponse({ type: ChannelResponseDto })
  @ApiNotFoundResponse({ description: 'Channel not found' })
  async move(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moveChannelSchema)) body: MoveChannelInput,
  ) {
    return this.channelsService.move(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a channel' })
  @ApiParam({ name: 'id', type: String, description: 'Channel UUID' })
  @ApiNoContentResponse({ description: 'Channel deleted' })
  @ApiNotFoundResponse({ description: 'Channel not found' })
  async remove(@Param('id') id: string) {
    await this.channelsService.remove(id);
  }
}
