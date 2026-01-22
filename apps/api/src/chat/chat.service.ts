import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, ILike } from 'typeorm';
import { Chat, LlmProvider } from './entities/chat.entity';
import { ChatMessage, ChatRole } from './entities/chat-message.entity';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { LlmService } from './llm/llm.service';
import { LlmMessage } from './llm/llm.interface';
import { MarketToolsService } from './tools/market-tools.service';

const SYSTEM_PROMPT = `You are Marketlum Assistant, an AI helper that answers questions about the user's market data.

Your capabilities:
- You can access real data from the Marketlum platform using the available tools
- You provide accurate, data-driven answers
- You prefer short, structured responses with bullet points when appropriate

Guidelines:
- Always use tools to get real data - never make up numbers or statistics
- If you don't have enough data to answer, say so clearly
- Present data in a clear, organized format
- When showing counts or statistics, mention where the data comes from

Available data domains:
- Agreements (contracts and deals)
- Exchanges (value exchanges between parties)
- Offerings (products and services offered)
- Values (types of value being exchanged)
- Value Streams (categories of value flow)
- Agents (individuals, organizations, teams)
- Users (system users)`;

const MAX_TOOL_ITERATIONS = 5;
const MAX_CONTEXT_MESSAGES = 20;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    private readonly llmService: LlmService,
    private readonly marketToolsService: MarketToolsService,
  ) {}

  async findAll(query?: string): Promise<Chat[]> {
    const where: any = { archivedAt: IsNull() };
    if (query) {
      where.title = ILike(`%${query}%`);
    }

    return this.chatRepository.find({
      where,
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Chat> {
    const chat = await this.chatRepository.findOne({
      where: { id },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    return chat;
  }

  async create(dto: CreateChatDto, userId?: string): Promise<Chat> {
    const provider = dto.provider || this.llmService.getDefaultProvider();
    const model = dto.model || this.llmService.getDefaultModel(provider);

    const chat = this.chatRepository.create({
      title: dto.title || 'New chat',
      provider,
      model,
      createdByUserId: userId || null,
    });

    return this.chatRepository.save(chat);
  }

  async update(id: string, dto: UpdateChatDto): Promise<Chat> {
    const chat = await this.findOne(id);

    if (dto.title !== undefined) chat.title = dto.title;
    if (dto.provider !== undefined) chat.provider = dto.provider;
    if (dto.model !== undefined) chat.model = dto.model;

    return this.chatRepository.save(chat);
  }

  async archive(id: string): Promise<void> {
    const chat = await this.findOne(id);
    chat.archivedAt = new Date();
    await this.chatRepository.save(chat);
  }

  async getMessages(chatId: string): Promise<ChatMessage[]> {
    await this.findOne(chatId); // Ensure chat exists

    return this.messageRepository.find({
      where: { chatId },
      order: { createdAt: 'ASC' },
    });
  }

  async sendMessage(chatId: string, dto: SendMessageDto): Promise<{
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
    toolMessages: ChatMessage[];
  }> {
    const chat = await this.findOne(chatId);
    const startTime = Date.now();

    // Create user message
    const userMessage = this.messageRepository.create({
      chatId,
      role: ChatRole.USER,
      content: dto.content,
    });
    await this.messageRepository.save(userMessage);

    // Update chat title if this is the first user message
    const messageCount = await this.messageRepository.count({ where: { chatId } });
    if (messageCount === 1) {
      // Generate title from first message (truncate to 50 chars)
      const title = dto.content.slice(0, 50) + (dto.content.length > 50 ? '...' : '');
      chat.title = title;
      await this.chatRepository.save(chat);
    }

    // Get conversation history
    const history = await this.getConversationHistory(chatId);

    // Build messages for LLM
    const messages: LlmMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
    ];

    const tools = this.marketToolsService.getToolDefinitions();
    const toolMessages: ChatMessage[] = [];

    let assistantContent = '';
    let tokenUsage: Record<string, number> | null = null;
    let iterations = 0;

    // Tool execution loop
    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++;

      try {
        const result = await this.llmService.generateResponse(chat.provider, {
          model: chat.model,
          messages,
          tools,
        });

        tokenUsage = result.tokenUsage || null;

        if (result.finishReason === 'tool_calls' && result.toolCalls) {
          // Execute tools
          for (const toolCall of result.toolCalls) {
            this.logger.log(`Executing tool: ${toolCall.name}`);

            let toolOutput: unknown;
            let toolError: string | null = null;

            try {
              toolOutput = await this.marketToolsService.executeTool(
                toolCall.name,
                toolCall.arguments,
              );
            } catch (error) {
              toolError = error instanceof Error ? error.message : 'Tool execution failed';
              toolOutput = { error: toolError };
            }

            // Save tool message
            const toolMessage = this.messageRepository.create({
              chatId,
              role: ChatRole.TOOL,
              content: JSON.stringify(toolOutput),
              toolName: toolCall.name,
              toolInput: toolCall.arguments,
              toolOutput: toolOutput as Record<string, unknown>,
              error: toolError,
            });
            await this.messageRepository.save(toolMessage);
            toolMessages.push(toolMessage);

            // Add to messages for next iteration
            // Note: We add assistant message with tool calls ONCE before all tool results
            if (messages[messages.length - 1]?.role !== 'assistant' || !messages[messages.length - 1]?.toolCalls) {
              messages.push({
                role: 'assistant',
                content: result.content || '',
                toolCalls: result.toolCalls,
              });
            }
            messages.push({
              role: 'tool',
              content: JSON.stringify(toolOutput),
              toolCallId: toolCall.id,
              toolName: toolCall.name,
            });
          }
        } else {
          // Final response
          assistantContent = result.content;
          break;
        }
      } catch (error) {
        this.logger.error('LLM error:', error);
        assistantContent = 'I apologize, but I encountered an error processing your request. Please try again.';
        break;
      }
    }

    const latencyMs = Date.now() - startTime;

    // Create assistant message
    const assistantMessage = this.messageRepository.create({
      chatId,
      role: ChatRole.ASSISTANT,
      content: assistantContent,
      tokenUsage,
      latencyMs,
    });
    await this.messageRepository.save(assistantMessage);

    // Update chat timestamp
    chat.updatedAt = new Date();
    await this.chatRepository.save(chat);

    return {
      userMessage,
      assistantMessage,
      toolMessages,
    };
  }

  private async getConversationHistory(chatId: string): Promise<LlmMessage[]> {
    const messages = await this.messageRepository.find({
      where: { chatId },
      order: { createdAt: 'ASC' },
      take: MAX_CONTEXT_MESSAGES,
    });

    return messages
      .filter((m) => m.role !== ChatRole.SYSTEM)
      .map((m) => ({
        role: m.role as LlmMessage['role'],
        content: m.content,
        toolCallId: m.role === ChatRole.TOOL ? m.id : undefined,
        toolName: m.toolName || undefined,
      }));
  }
}
