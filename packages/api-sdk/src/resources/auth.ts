import { AxiosInstance } from "axios";
import { BaseResource } from "./base";

export interface LoginResponse {
    user: {
        id: string;
        email: string;
        isActive: boolean;
        agentId: string;
        defaultLocaleId: string;
        avatarFileId: string | null;
    };
    accessToken: string;
}

export class AuthResource extends BaseResource {
    constructor(client: AxiosInstance, baseUrl: string) {
        super(client, baseUrl);
    }

    public async login(email: string, password: string): Promise<LoginResponse> {
        const response = await this.client.post(`/auth/login`, { email, password });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to login.");
    }

    public async logout(): Promise<{ ok: true }> {
        const response = await this.client.post(`/auth/logout`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to logout.");
    }

    public async getMe(token: string): Promise<any> {
        const response = await this.client.get(`/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch current user.");
    }

    public async forgotPassword(email: string): Promise<{ ok: true }> {
        const response = await this.client.post(`/auth/forgot-password`, { email });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to request password reset.");
    }

    public async resetPassword(token: string, newPassword: string): Promise<{ ok: true }> {
        const response = await this.client.post(`/auth/reset-password`, { token, newPassword });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to reset password.");
    }
}
