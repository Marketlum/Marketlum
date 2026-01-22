import { AxiosInstance } from "axios";
import { BaseResource } from "./base";

export class OfferingsResource extends BaseResource {
    constructor(client: AxiosInstance, baseUrl: string) {
        super(client, baseUrl);
    }

    public async getAll(params?: {
        page?: number;
        limit?: number;
        q?: string;
        state?: 'draft' | 'live' | 'archived';
        agentId?: string;
        valueStreamId?: string;
        active?: boolean;
        sort?: string;
    }) {
        const response = await this.client.get(`/offerings`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch offerings.");
    }

    public async get(id: string) {
        const response = await this.client.get(`/offerings/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the offering.");
    }

    public async create(data: {
        name: string;
        description?: string;
        purpose?: string;
        link?: string;
        activeFrom?: string;
        activeUntil?: string;
        agentId: string;
        valueStreamId?: string;
    }) {
        const response = await this.client.post(`/offerings`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the offering.");
    }

    public async update(id: string, data: {
        name?: string;
        description?: string | null;
        purpose?: string | null;
        link?: string | null;
        activeFrom?: string | null;
        activeUntil?: string | null;
        agentId?: string;
        valueStreamId?: string | null;
    }) {
        const response = await this.client.patch(`/offerings/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the offering.");
    }

    public async delete(id: string) {
        const response = await this.client.delete(`/offerings/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the offering.");
    }

    public async transition(id: string, to: 'draft' | 'live' | 'archived') {
        const response = await this.client.post(`/offerings/${id}/transition`, { to });

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to transition the offering.");
    }

    public async addItem(offeringId: string, data: {
        valueId: string;
        quantity: number;
        pricingFormula?: string;
        pricingLink?: string;
    }) {
        const response = await this.client.post(`/offerings/${offeringId}/items`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to add item to offering.");
    }

    public async updateItem(offeringId: string, itemId: string, data: {
        quantity?: number;
        pricingFormula?: string;
        pricingLink?: string;
    }) {
        const response = await this.client.patch(`/offerings/${offeringId}/items/${itemId}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update offering item.");
    }

    public async removeItem(offeringId: string, itemId: string) {
        const response = await this.client.delete(`/offerings/${offeringId}/items/${itemId}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to remove item from offering.");
    }

    public async attachFile(offeringId: string, fileId: string) {
        const response = await this.client.post(`/offerings/${offeringId}/files`, { fileId });

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to attach file to offering.");
    }

    public async removeFile(offeringId: string, fileId: string) {
        const response = await this.client.delete(`/offerings/${offeringId}/files/${fileId}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to remove file from offering.");
    }

    public async seed(): Promise<{ inserted: number; skipped: number }> {
        const response = await this.client.post(`/offerings/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed offerings.");
    }
}
