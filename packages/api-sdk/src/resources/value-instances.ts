import { AxiosInstance } from "axios";
import { BaseResource } from "./base";

export class ValueInstancesResource extends BaseResource {
    constructor(client: AxiosInstance, baseUrl: string) {
        super(client, baseUrl);
    }

    public async getAll(params?: {
        q?: string;
        valueId?: string;
        fromAgentId?: string;
        toAgentId?: string;
        direction?: string;
        visibility?: string;
        parentId?: string | null;
        sort?: string;
        page?: number;
        pageSize?: number;
    }) {
        const response = await this.client.get(`/value-instances`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch value instances.");
    }

    public async getTree(params?: {
        valueId?: string;
        visibility?: string;
    }) {
        const response = await this.client.get(`/value-instances/tree`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch value instances tree.");
    }

    public async get(id: string) {
        const response = await this.client.get(`/value-instances/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch value instance.");
    }

    public async create(data: {
        valueId: string;
        name: string;
        purpose?: string;
        version?: string;
        direction: string;
        fromAgentId?: string;
        toAgentId?: string;
        parentId?: string;
        link?: string;
        imageFileId?: string;
        visibility?: string;
    }) {
        const response = await this.client.post(`/value-instances`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create value instance.");
    }

    public async update(id: string, data: {
        valueId?: string;
        name?: string;
        purpose?: string;
        version?: string;
        direction?: string;
        fromAgentId?: string | null;
        toAgentId?: string | null;
        parentId?: string | null;
        link?: string | null;
        imageFileId?: string | null;
        visibility?: string;
    }) {
        const response = await this.client.patch(`/value-instances/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update value instance.");
    }

    public async delete(id: string) {
        const response = await this.client.delete(`/value-instances/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete value instance.");
    }

    public async seed() {
        const response = await this.client.post(`/value-instances/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed value instances.");
    }
}
