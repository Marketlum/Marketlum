import { AxiosInstance } from "axios";
import { BaseResource } from "./base";

export class AgreementsResource extends BaseResource {
    constructor(client: AxiosInstance, baseUrl: string) {
        super(client, baseUrl);
    }

    public async getAll(params?: {
        page?: number;
        limit?: number;
        q?: string;
        category?: string;
        status?: string;
        gateway?: string;
        agentId?: string;
        sort?: string;
    }) {
        const response = await this.client.get(`/agreements`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch agreements.");
    }

    public async getTree() {
        const response = await this.client.get(`/agreements/tree`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch agreements tree.");
    }

    public async getStats(params?: { category?: string; agentId?: string }) {
        const response = await this.client.get(`/agreements/stats`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch agreements stats.");
    }

    public async get(id: string) {
        const response = await this.client.get(`/agreements/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the agreement.");
    }

    public async create(data: {
        title: string;
        category: string;
        gateway: string;
        link?: string;
        content?: string;
        completedAt?: string;
        parentId?: string;
        fileId?: string;
        parties?: Array<{ agentId: string; role?: string }>;
    }) {
        const response = await this.client.post(`/agreements`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the agreement.");
    }

    public async update(id: string, data: {
        title?: string;
        category?: string;
        gateway?: string;
        link?: string | null;
        content?: string | null;
        completedAt?: string | null;
        parentId?: string | null;
        fileId?: string | null;
        parties?: Array<{ agentId: string; role?: string }>;
    }) {
        const response = await this.client.patch(`/agreements/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the agreement.");
    }

    public async delete(id: string) {
        const response = await this.client.delete(`/agreements/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the agreement.");
    }

    public async addParty(agreementId: string, data: { agentId: string; role?: string }) {
        const response = await this.client.post(`/agreements/${agreementId}/parties`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to add party to agreement.");
    }

    public async removeParty(agreementId: string, agentId: string) {
        const response = await this.client.delete(`/agreements/${agreementId}/parties/${agentId}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to remove party from agreement.");
    }

    public async seed(): Promise<{ inserted: number; skipped: number }> {
        const response = await this.client.post(`/agreements/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed agreements.");
    }
}
