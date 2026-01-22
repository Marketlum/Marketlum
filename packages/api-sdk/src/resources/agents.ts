import { AxiosInstance } from "axios";
import { BaseResource } from "./base";

export class AgentsResource extends BaseResource {
    constructor(client: AxiosInstance, baseUrl: string) {
        super(client, baseUrl);
    }

    public async getAll(page: number = 1, limit: number = 10, geographyId?: string) {
        const response = await this.client.get(`/agents`, {
            params: { page, limit, geographyId }
        });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch agents.");
    }

    public async get(id: string) {
        const response = await this.client.get(`/agents/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the agent.");
    }

    public async create(data: {
        name: string;
        type: string;
        geographyId?: string;
        street?: string;
        city?: string;
        postalCode?: string;
        country?: string;
        latitude?: number;
        longitude?: number;
    }) {
        const response = await this.client.post(`/agents`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the agent.");
    }

    public async update(id: string, data: {
        name?: string;
        type?: string;
        geographyId?: string | null;
        street?: string | null;
        city?: string | null;
        postalCode?: string | null;
        country?: string | null;
        latitude?: number | null;
        longitude?: number | null;
    }) {
        const response = await this.client.patch(`/agents/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the agent.");
    }

    public async getForMap() {
        const response = await this.client.get(`/agents/map`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch agents for map.");
    }

    public async delete(id: string) {
        const response = await this.client.delete(`/agents/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the agent.");
    }
}
