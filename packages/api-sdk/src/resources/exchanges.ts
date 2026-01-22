import { AxiosInstance } from "axios";
import { BaseResource } from "./base";

export class ExchangesResource extends BaseResource {
    constructor(client: AxiosInstance, baseUrl: string) {
        super(client, baseUrl);
    }

    public async getAll(params?: {
        q?: string;
        state?: 'open' | 'completed' | 'closed';
        valueStreamId?: string;
        leadUserId?: string;
        channelId?: string;
        taxonId?: string;
        agentId?: string;
        sort?: string;
    }) {
        const response = await this.client.get(`/exchanges`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch exchanges.");
    }

    public async get(id: string) {
        const response = await this.client.get(`/exchanges/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the exchange.");
    }

    public async create(data: {
        name: string;
        purpose?: string;
        valueStreamId: string;
        channelId?: string;
        taxonId?: string;
        leadUserId?: string;
    }) {
        const response = await this.client.post(`/exchanges`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the exchange.");
    }

    public async update(id: string, data: {
        name?: string;
        purpose?: string | null;
        channelId?: string | null;
        taxonId?: string | null;
        leadUserId?: string | null;
        agreementId?: string | null;
    }) {
        const response = await this.client.patch(`/exchanges/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the exchange.");
    }

    public async delete(id: string) {
        const response = await this.client.delete(`/exchanges/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the exchange.");
    }

    public async transition(id: string, to: 'open' | 'completed' | 'closed', reason?: string) {
        const response = await this.client.post(`/exchanges/${id}/transition`, { to, reason });

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to transition the exchange.");
    }

    public async setParties(id: string, parties: Array<{ agentId: string }>) {
        const partyAgentIds = parties.map(p => p.agentId);
        const response = await this.client.put(`/exchanges/${id}/parties`, { partyAgentIds });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to set exchange parties.");
    }

    public async createFlow(exchangeId: string, data: {
        fromPartyAgentId: string;
        toPartyAgentId: string;
        valueId: string;
        quantity: number;
        note?: string;
    }) {
        const response = await this.client.post(`/exchanges/${exchangeId}/flows`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create exchange flow.");
    }

    public async updateFlow(exchangeId: string, flowId: string, data: {
        fromPartyAgentId?: string;
        toPartyAgentId?: string;
        valueId?: string;
        quantity?: number;
        note?: string | null;
    }) {
        const response = await this.client.patch(`/exchanges/${exchangeId}/flows/${flowId}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update exchange flow.");
    }

    public async removeFlow(exchangeId: string, flowId: string) {
        const response = await this.client.delete(`/exchanges/${exchangeId}/flows/${flowId}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to remove exchange flow.");
    }

    public async createAgreement(exchangeId: string, data: {
        title: string;
        category: string;
        gateway: string;
        link?: string;
        content?: string;
    }) {
        const response = await this.client.post(`/exchanges/${exchangeId}/create-agreement`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create agreement from exchange.");
    }

    public async seed(): Promise<{ exchanges: number; flows: number }> {
        const response = await this.client.post(`/exchanges/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed exchanges.");
    }
}
