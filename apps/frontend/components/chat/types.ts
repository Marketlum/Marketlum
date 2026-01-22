export type LlmProvider = 'openai' | 'anthropic';
export type ChatRole = 'user' | 'assistant' | 'system' | 'tool';

export interface Chat {
  id: string;
  title: string;
  provider: LlmProvider;
  model: string;
  createdByUserId: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  role: ChatRole;
  content: string;
  toolName: string | null;
  toolInput: Record<string, unknown> | null;
  toolOutput: Record<string, unknown> | null;
  tokenUsage: Record<string, number> | null;
  latencyMs: number | null;
  error: string | null;
  createdAt: string;
}

export interface LlmModel {
  id: string;
  name: string;
}

export interface LlmProviderConfig {
  id: string;
  name: string;
  models: LlmModel[];
}

export interface ChatModelsResponse {
  providers: LlmProviderConfig[];
}

export interface SendMessageResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  toolMessages: ChatMessage[];
}
