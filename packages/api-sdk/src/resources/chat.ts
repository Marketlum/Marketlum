import { AxiosInstance } from "axios";
import { BaseResource } from "./base";

export interface ChatModelsResponse {
    providers: Array<{
        id: string;
        name: string;
        models: Array<{ id: string; name: string }>;
    }>;
}

export interface SendMessageResponse {
    userMessage: any;
    assistantMessage: any;
    toolMessages: any[];
}

export class ChatResource extends BaseResource {
    constructor(client: AxiosInstance, baseUrl: string) {
        super(client, baseUrl);
    }

    public async getModels(): Promise<ChatModelsResponse> {
        const response = await this.client.get(`/chat/models`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch chat models.");
    }

    public async getAll(q?: string) {
        const response = await this.client.get(`/chat`, { params: { q } });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch chats.");
    }

    public async get(id: string) {
        const response = await this.client.get(`/chat/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the chat.");
    }

    public async create(data: {
        title?: string;
        provider?: 'openai' | 'anthropic';
        model?: string;
    }) {
        const response = await this.client.post(`/chat`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the chat.");
    }

    public async update(id: string, data: {
        title?: string;
        provider?: 'openai' | 'anthropic';
        model?: string;
    }) {
        const response = await this.client.patch(`/chat/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the chat.");
    }

    public async archive(id: string) {
        const response = await this.client.delete(`/chat/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to archive the chat.");
    }

    public async getMessages(chatId: string) {
        const response = await this.client.get(`/chat/${chatId}/messages`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch chat messages.");
    }

    public async sendMessage(chatId: string, content: string): Promise<SendMessageResponse> {
        const response = await this.client.post(`/chat/${chatId}/messages`, { content });

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to send chat message.");
    }
}
