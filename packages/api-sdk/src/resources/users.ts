import { AxiosInstance } from "axios";
import { BaseResource } from "./base";

export class UsersResource extends BaseResource {
    constructor(client: AxiosInstance, baseUrl: string) {
        super(client, baseUrl);
    }

    public async getAll(params?: {
        page?: number;
        pageSize?: number;
        q?: string;
        isActive?: boolean;
        agentId?: string;
        localeId?: string;
        sort?: string;
    }) {
        const response = await this.client.get(`/users`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch users.");
    }

    public async get(id: string) {
        const response = await this.client.get(`/users/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the user.");
    }

    public async create(data: {
        email: string;
        password: string;
        isActive?: boolean;
        avatarFileId?: string;
        agentId: string;
        relationshipAgreementId?: string;
        birthday?: string;
        joinedAt?: string;
        leftAt?: string;
        defaultLocaleId: string;
    }) {
        const response = await this.client.post(`/users`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the user.");
    }

    public async update(id: string, data: {
        email?: string;
        isActive?: boolean;
        avatarFileId?: string | null;
        agentId?: string;
        relationshipAgreementId?: string | null;
        birthday?: string | null;
        joinedAt?: string | null;
        leftAt?: string | null;
        defaultLocaleId?: string;
    }) {
        const response = await this.client.patch(`/users/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the user.");
    }

    public async setPassword(id: string, newPassword: string): Promise<{ ok: true }> {
        const response = await this.client.post(`/users/${id}/set-password`, { newPassword });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to set user password.");
    }

    public async delete(id: string) {
        const response = await this.client.delete(`/users/${id}`);

        if (response.status === 204) {
            return true;
        }

        throw new Error("Failed to delete the user.");
    }

    public async seed(): Promise<{ inserted: number; skipped: number }> {
        const response = await this.client.post(`/users/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed users.");
    }
}
