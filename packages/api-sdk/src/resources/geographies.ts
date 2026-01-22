import { AxiosInstance } from "axios";
import { BaseResource } from "./base";

export class GeographiesResource extends BaseResource {
    constructor(client: AxiosInstance, baseUrl: string) {
        super(client, baseUrl);
    }

    public async getTree() {
        const response = await this.client.get(`/geographies/tree`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch geographies tree.");
    }

    public async get(id: string) {
        const response = await this.client.get(`/geographies/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the geography.");
    }

    public async create(data: { name: string; code: string; level: string; parentId?: string }) {
        const response = await this.client.post(`/geographies`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the geography.");
    }

    public async update(id: string, data: { name?: string; code?: string; level?: string; parentId?: string }) {
        const response = await this.client.patch(`/geographies/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the geography.");
    }

    public async move(id: string, parentId: string | null) {
        const response = await this.client.post(`/geographies/${id}/move`, { parentId });

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to move the geography.");
    }

    public async delete(id: string) {
        const response = await this.client.delete(`/geographies/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the geography.");
    }

    public async seed() {
        const response = await this.client.post(`/geographies/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed geographies.");
    }
}
