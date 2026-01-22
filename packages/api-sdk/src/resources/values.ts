import { AxiosInstance } from "axios";
import { BaseResource } from "./base";

export class ValuesResource extends BaseResource {
    constructor(client: AxiosInstance, baseUrl: string) {
        super(client, baseUrl);
    }

    public async getFlat(streamId: number) {
        const response = await this.client.get(`/value/flat/${streamId}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the value.");
    }

    public async getTree() {
        const response = await this.client.get(`/value`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch values tree.");
    }

    public async getList(
        page: number = 1,
        limit: number = 10,
        options?: {
            search?: string;
            type?: string;
            sortBy?: string;
            sortOrder?: 'ASC' | 'DESC';
        }
    ) {
        const response = await this.client.get(`/value/list`, {
            params: {
                page,
                limit,
                ...options,
            }
        });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch values list.");
    }

    public async get(id: string) {
        const response = await this.client.get(`/value/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the value.");
    }

    public async create(data: { name: string; description?: string; type: string; parentType: string; parentId?: string; streamId?: string; agentId?: string; fileIds?: string[] }) {
        const response = await this.client.post(`/value`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the value.");
    }

    public async update(id: string, data: { name?: string; description?: string; type?: string; parentType?: string; parentId?: string; streamId?: string; agentId?: string; fileIds?: string[] }) {
        const response = await this.client.patch(`/value/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the value.");
    }

    public async delete(id: string) {
        const response = await this.client.delete(`/value/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the value.");
    }

    public async seed(): Promise<{ inserted: number; skipped: number }> {
        const response = await this.client.post(`/value/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed values.");
    }
}
