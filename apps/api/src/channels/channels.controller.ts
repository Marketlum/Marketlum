import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { MoveChannelDto } from './dto/move-channel.dto';
import { Channel } from './entities/channel.entity';

@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  create(@Body() createChannelDto: CreateChannelDto): Promise<Channel> {
    return this.channelsService.create(createChannelDto);
  }

  @Get('tree')
  findTree(): Promise<Channel[]> {
    return this.channelsService.findTree();
  }

  @Get()
  findAll(
    @Query('parentId') parentId?: string,
    @Query('type') type?: string,
  ): Promise<Channel[]> {
    return this.channelsService.findAll(parentId, type);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Channel | null> {
    return this.channelsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateChannelDto: UpdateChannelDto,
  ): Promise<Channel> {
    return this.channelsService.update(id, updateChannelDto);
  }

  @Post(':id/move')
  move(
    @Param('id') id: string,
    @Body() moveChannelDto: MoveChannelDto,
  ): Promise<Channel> {
    return this.channelsService.move(id, moveChannelDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.channelsService.remove(id);
  }
}
