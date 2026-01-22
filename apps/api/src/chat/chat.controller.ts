import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { LlmService } from './llm/llm.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly llmService: LlmService,
  ) {}

  // ============= LLM MODELS =============

  @Get('models')
  @ApiOperation({ summary: 'Get available LLM models' })
  getModels() {
    return {
      providers: this.llmService.getAvailableProviders(),
    };
  }

  // ============= CHATS CRUD =============

  @Post()
  @ApiOperation({ summary: 'Create a new chat' })
  create(@Body() createChatDto: CreateChatDto) {
    return this.chatService.create(createChatDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all chats' })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search in title' })
  findAll(@Query('q') q?: string) {
    return this.chatService.findAll(q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single chat by ID' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.chatService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a chat' })
  @ApiParam({ name: 'id', type: String })
  update(@Param('id') id: string, @Body() updateChatDto: UpdateChatDto) {
    return this.chatService.update(id, updateChatDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a chat' })
  @ApiParam({ name: 'id', type: String })
  archive(@Param('id') id: string) {
    return this.chatService.archive(id);
  }

  // ============= MESSAGES =============

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get messages for a chat' })
  @ApiParam({ name: 'id', type: String })
  getMessages(@Param('id') id: string) {
    return this.chatService.getMessages(id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message and get AI response' })
  @ApiParam({ name: 'id', type: String })
  sendMessage(@Param('id') id: string, @Body() sendMessageDto: SendMessageDto) {
    return this.chatService.sendMessage(id, sendMessageDto);
  }
}
