import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  LlmClient,
  LlmClientInput,
  LlmResult,
  LlmMessage,
  ToolDefinition,
} from './llm.interface';

@Injectable()
export class AnthropicLlmClient implements LlmClient {
  private readonly logger = new Logger(AnthropicLlmClient.name);
  private client: Anthropic | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  async generateResponse(input: LlmClientInput): Promise<LlmResult> {
    if (!this.client) {
      throw new Error('Anthropic API key not configured');
    }

    const { systemPrompt, messages } = this.convertMessages(input.messages);
    const tools = input.tools ? this.convertTools(input.tools) : undefined;

    try {
      const response = await this.client.messages.create({
        model: input.model,
        max_tokens: input.maxTokens ?? 2048,
        system: systemPrompt,
        messages,
        tools,
      });

      const result: LlmResult = {
        content: '',
        finishReason: this.mapStopReason(response.stop_reason),
        tokenUsage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
      };

      // Process content blocks
      const toolCalls: LlmResult['toolCalls'] = [];
      for (const block of response.content) {
        if (block.type === 'text') {
          result.content += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            name: block.name,
            arguments: block.input as Record<string, unknown>,
          });
        }
      }

      if (toolCalls.length > 0) {
        result.toolCalls = toolCalls;
      }

      return result;
    } catch (error) {
      this.logger.error('Anthropic API error:', error);
      throw error;
    }
  }

  private convertMessages(messages: LlmMessage[]): {
    systemPrompt: string;
    messages: Anthropic.MessageParam[];
  } {
    let systemPrompt = '';
    const convertedMessages: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt += (systemPrompt ? '\n' : '') + msg.content;
      } else if (msg.role === 'tool') {
        // Tool results need to be added as user messages with tool_result content
        convertedMessages.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: msg.toolCallId || '',
            content: msg.content,
          }],
        });
      } else {
        convertedMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    return { systemPrompt, messages: convertedMessages };
  }

  private convertTools(tools: ToolDefinition[]): Anthropic.Tool[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object' as const,
        properties: tool.parameters.properties,
        required: tool.parameters.required,
      },
    }));
  }

  private mapStopReason(reason: string | null): LlmResult['finishReason'] {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'tool_use':
        return 'tool_calls';
      case 'max_tokens':
        return 'length';
      default:
        return 'stop';
    }
  }
}
