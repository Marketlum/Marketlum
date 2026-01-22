import { AxiosInstance } from "axios";
import { BaseResource } from "./base";

export class ChannelsResource extends BaseResource {
    constructor(client: AxiosInstance, baseUrl: string) {
        super(client, baseUrl);
    }

    public async getTree() {
        const response = await this.client.get(`/channels/tree`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch channels tree.");
    }

    public async getAll(parentId?: string, type?: string) {
        const response = await this.client.get(`/channels`, {
            params: { parentId, type }
        });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch channels.");
    }

    public async get(id: string) {
        const response = await this.client.get(`/channels/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the channel.");
    }

    public async create(data: { name: string; type: string; purpose?: string; parentId?: string }) {
        const response = await this.client.post(`/channels`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the channel.");
    }

    public async update(id: string, data: { name?: string; type?: string; purpose?: string; parentId?: string }) {
        const response = await this.client.patch(`/channels/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the channel.");
    }

    public async move(id: string, parentId: string | null) {
        const response = await this.client.post(`/channels/${id}/move`, { parentId });

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to move the channel.");
    }

    public async delete(id: string) {
        const response = await this.client.delete(`/channels/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the channel.");
    }
}
