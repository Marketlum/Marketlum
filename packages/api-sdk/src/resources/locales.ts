import { AxiosInstance } from "axios";
import { BaseResource } from "./base";

export class LocalesResource extends BaseResource {
    constructor(client: AxiosInstance, baseUrl: string) {
        super(client, baseUrl);
    }

    public async getAll(params?: {
        page?: number;
        pageSize?: number;
        q?: string;
        sort?: string;
    }) {
        const response = await this.client.get(`/locales`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch locales.");
    }

    public async get(id: string) {
        const response = await this.client.get(`/locales/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the locale.");
    }

    public async create(data: { code: string }) {
        const response = await this.client.post(`/locales`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the locale.");
    }

    public async update(id: string, data: { code?: string }) {
        const response = await this.client.patch(`/locales/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the locale.");
    }

    public async delete(id: string) {
        const response = await this.client.delete(`/locales/${id}`);

        if (response.status === 204) {
            return true;
        }

        throw new Error("Failed to delete the locale.");
    }

    public async seed(): Promise<{ inserted: number; skipped: number }> {
        const response = await this.client.post(`/locales/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed locales.");
    }
}
