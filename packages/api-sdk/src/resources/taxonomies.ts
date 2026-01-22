import { AxiosInstance } from "axios";
import { BaseResource } from "./base";

export class TaxonomiesResource extends BaseResource {
    constructor(client: AxiosInstance, baseUrl: string) {
        super(client, baseUrl);
    }

    public async getAll() {
        const response = await this.client.get(`/taxonomies`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch taxonomies.");
    }

    public async get(id: string) {
        const response = await this.client.get(`/taxonomies/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the taxonomy.");
    }

    public async create(data: {
        name: string;
        description?: string;
        link?: string;
        parentId?: string;
        imageId?: string;
    }) {
        const response = await this.client.post(`/taxonomies`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the taxonomy.");
    }

    public async update(id: string, data: {
        name?: string;
        description?: string | null;
        link?: string | null;
        imageId?: string | null;
    }) {
        const response = await this.client.patch(`/taxonomies/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the taxonomy.");
    }

    public async delete(id: string) {
        const response = await this.client.delete(`/taxonomies/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the taxonomy.");
    }
}
