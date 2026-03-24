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
import { ChannelsService } from './channels.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
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

@Controller('channels')
@UseGuards(AdminGuard)
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createChannelSchema)) body: CreateChannelInput,
  ) {
    return this.channelsService.create(body);
  }

  @Get('search')
  async search(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('agentId') agentId?: string,
  ) {
    return this.channelsService.search({ ...query, agentId });
  }

  @Get('tree')
  async findTree() {
    return this.channelsService.findTree();
  }

  @Get('roots')
  async findRoots() {
    return this.channelsService.findRoots();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.channelsService.findOne(id);
  }

  @Get(':id/children')
  async findChildren(@Param('id') id: string) {
    return this.channelsService.findChildren(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateChannelSchema)) body: UpdateChannelInput,
  ) {
    return this.channelsService.update(id, body);
  }

  @Patch(':id/move')
  async move(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moveChannelSchema)) body: MoveChannelInput,
  ) {
    return this.channelsService.move(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.channelsService.remove(id);
  }
}
