import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmProvider } from '../entities/chat.entity';
import { LlmClient, LlmClientInput, LlmResult } from './llm.interface';
import { OpenAiLlmClient } from './openai.client';
import { AnthropicLlmClient } from './anthropic.client';

export interface AvailableModel {
  provider: LlmProvider;
  model: string;
  name: string;
}

export interface ProviderModels {
  provider: LlmProvider;
  name: string;
  models: Array<{ model: string; name: string }>;
}

@Injectable()
export class LlmService {
  private readonly clients: Map<LlmProvider, LlmClient> = new Map();
  private readonly availableModels: AvailableModel[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly openAiClient: OpenAiLlmClient,
    private readonly anthropicClient: AnthropicLlmClient,
  ) {
    // Register OpenAI if configured
    if (this.configService.get<string>('OPENAI_API_KEY')) {
      this.clients.set(LlmProvider.OPENAI, this.openAiClient);
      this.availableModels.push(
        { provider: LlmProvider.OPENAI, model: 'gpt-4o', name: 'GPT-4o' },
        { provider: LlmProvider.OPENAI, model: 'gpt-4o-mini', name: 'GPT-4o Mini' },
        { provider: LlmProvider.OPENAI, model: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      );
    }

    // Register Anthropic if configured
    if (this.configService.get<string>('ANTHROPIC_API_KEY')) {
      this.clients.set(LlmProvider.ANTHROPIC, this.anthropicClient);
      this.availableModels.push(
        { provider: LlmProvider.ANTHROPIC, model: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
        { provider: LlmProvider.ANTHROPIC, model: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
        { provider: LlmProvider.ANTHROPIC, model: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
      );
    }
  }

  getAvailableProviders(): ProviderModels[] {
    const providerMap = new Map<LlmProvider, ProviderModels>();

    for (const model of this.availableModels) {
      if (!providerMap.has(model.provider)) {
        providerMap.set(model.provider, {
          provider: model.provider,
          name: model.provider === LlmProvider.OPENAI ? 'OpenAI' : 'Anthropic',
          models: [],
        });
      }
      providerMap.get(model.provider)!.models.push({
        model: model.model,
        name: model.name,
      });
    }

    return Array.from(providerMap.values());
  }

  getDefaultProvider(): LlmProvider {
    if (this.clients.has(LlmProvider.ANTHROPIC)) {
      return LlmProvider.ANTHROPIC;
    }
    if (this.clients.has(LlmProvider.OPENAI)) {
      return LlmProvider.OPENAI;
    }
    throw new Error('No LLM provider configured');
  }

  getDefaultModel(provider: LlmProvider): string {
    const models = this.availableModels.filter((m) => m.provider === provider);
    if (models.length === 0) {
      throw new Error(`No models available for provider: ${provider}`);
    }
    return models[0].model;
  }

  async generateResponse(
    provider: LlmProvider,
    input: LlmClientInput,
  ): Promise<LlmResult> {
    const client = this.clients.get(provider);
    if (!client) {
      throw new Error(`Provider not configured: ${provider}`);
    }
    return client.generateResponse(input);
  }
}
