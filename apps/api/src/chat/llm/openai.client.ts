import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  LlmClient,
  LlmClientInput,
  LlmResult,
  LlmMessage,
  ToolDefinition,
} from './llm.interface';

@Injectable()
export class OpenAiLlmClient implements LlmClient {
  private readonly logger = new Logger(OpenAiLlmClient.name);
  private client: OpenAI | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  async generateResponse(input: LlmClientInput): Promise<LlmResult> {
    if (!this.client) {
      throw new Error('OpenAI API key not configured');
    }

    const messages = this.convertMessages(input.messages);
    const tools = input.tools ? this.convertTools(input.tools) : undefined;

    try {
      const response = await this.client.chat.completions.create({
        model: input.model,
        messages,
        tools,
        max_tokens: input.maxTokens ?? 2048,
        temperature: input.temperature ?? 0.7,
      });

      const choice = response.choices[0];
      const message = choice.message;

      const result: LlmResult = {
        content: message.content || '',
        finishReason: this.mapFinishReason(choice.finish_reason),
        tokenUsage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
      };

      if (message.tool_calls && message.tool_calls.length > 0) {
        result.toolCalls = (message.tool_calls as Array<{ id: string; function: { name: string; arguments: string } }>).map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments),
        }));
      }

      return result;
    } catch (error) {
      this.logger.error('OpenAI API error:', error);
      throw error;
    }
  }

  private convertMessages(messages: LlmMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
    return messages.map((msg) => {
      if (msg.role === 'tool') {
        return {
          role: 'tool' as const,
          content: msg.content,
          tool_call_id: msg.toolCallId || '',
        };
      }
      return {
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      };
    });
  }

  private convertTools(tools: ToolDefinition[]): OpenAI.Chat.ChatCompletionTool[] {
    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  private mapFinishReason(reason: string | null): LlmResult['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'tool_calls':
        return 'tool_calls';
      case 'length':
        return 'length';
      default:
        return 'stop';
    }
  }
}
