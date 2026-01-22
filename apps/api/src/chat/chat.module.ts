import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Chat } from './entities/chat.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { LlmService } from './llm/llm.service';
import { OpenAiLlmClient } from './llm/openai.client';
import { AnthropicLlmClient } from './llm/anthropic.client';
import { MarketToolsService } from './tools/market-tools.service';
import { Agreement } from '../agreements/entities/agreement.entity';
import { Exchange } from '../exchanges/entities/exchange.entity';
import { ExchangeFlow } from '../exchanges/entities/exchange-flow.entity';
import { Offering } from '../offerings/entities/offering.entity';
import { OfferingItem } from '../offerings/entities/offering-item.entity';
import { User } from '../users/entities/user.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Value } from '../value/entities/value.entity';
import { ValueStream } from '../value_streams/entities/value_stream.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Chat,
      ChatMessage,
      Agreement,
      Exchange,
      ExchangeFlow,
      Offering,
      OfferingItem,
      User,
      Agent,
      Value,
      ValueStream,
    ]),
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    LlmService,
    OpenAiLlmClient,
    AnthropicLlmClient,
    MarketToolsService,
  ],
  exports: [ChatService],
})
export class ChatModule {}
