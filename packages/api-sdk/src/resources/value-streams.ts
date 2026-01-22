import { AxiosInstance } from "axios";
import { BaseResource } from "./base";

export interface ValueStreamStats {
    values: {
        total: number;
        byType: {
            product: number;
            service: number;
            relationship: number;
            right: number;
        };
    };
    valueInstances: {
        total: number;
        byDirection: {
            incoming: number;
            outgoing: number;
            internal: number;
            neutral: number;
        };
    };
    exchanges: {
        total: number;
        byState: {
            open: number;
            completed: number;
            closed: number;
        };
    };
    offerings: {
        total: number;
        byState: {
            draft: number;
            live: number;
            archived: number;
        };
    };
}

export class ValueStreamsResource extends BaseResource {
    constructor(client: AxiosInstance, baseUrl: string) {
        super(client, baseUrl);
    }

    public async getAll() {
        const response = await this.client.get(`/value-streams`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the value streams.");
    }

    public async get(id: number) {
        const response = await this.client.get(`/value-streams/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the value stream.");
    }

    public async delete(id: string) {
        const response = await this.client.delete(`/value-streams/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the value stream.");
    }

    public async update(id: string, data: { name?: string, purpose?: string, imageId?: string | null }) {
        const response = await this.client.patch(`/value-streams/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the value stream.");
    }

    public async create(data: { name: string, purpose: string, parentId?: string, imageId?: string }) {
        const response = await this.client.post(`/value-streams`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the value stream.");
    }

    public async getStats(id: string): Promise<ValueStreamStats> {
        const response = await this.client.get(`/value-streams/${id}/stats`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch value stream stats.");
    }
}
