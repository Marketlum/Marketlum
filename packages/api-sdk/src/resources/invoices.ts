import { AxiosInstance } from "axios";
import { BaseResource } from "./base";

export class InvoicesResource extends BaseResource {
    constructor(client: AxiosInstance, baseUrl: string) {
        super(client, baseUrl);
    }

    public async getAll(params?: {
        q?: string;
        fromAgentId?: string;
        toAgentId?: string;
        issuedFrom?: string;
        issuedTo?: string;
        dueFrom?: string;
        dueTo?: string;
        hasFile?: boolean;
        sort?: string;
        page?: number;
        pageSize?: number;
    }) {
        const response = await this.client.get(`/invoices`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch invoices.");
    }

    public async get(id: string) {
        const response = await this.client.get(`/invoices/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch invoice.");
    }

    public async create(data: {
        fromAgentId: string;
        toAgentId: string;
        number: string;
        issuedAt: string;
        dueAt: string;
        link?: string;
        fileId?: string;
        note?: string;
    }) {
        const response = await this.client.post(`/invoices`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create invoice.");
    }

    public async update(id: string, data: {
        fromAgentId?: string;
        toAgentId?: string;
        number?: string;
        issuedAt?: string;
        dueAt?: string;
        link?: string;
        fileId?: string;
        note?: string;
    }) {
        const response = await this.client.patch(`/invoices/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update invoice.");
    }

    public async delete(id: string) {
        const response = await this.client.delete(`/invoices/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete invoice.");
    }

    public async seed() {
        const response = await this.client.post(`/invoices/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed invoices.");
    }

    // Invoice Items

    public async addItem(invoiceId: string, data: {
        valueId?: string;
        valueInstanceId?: string;
        quantity: number;
        description?: string;
    }) {
        const response = await this.client.post(`/invoices/${invoiceId}/items`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to add invoice item.");
    }

    public async updateItem(invoiceId: string, itemId: string, data: {
        valueId?: string;
        valueInstanceId?: string;
        quantity?: number;
        description?: string;
    }) {
        const response = await this.client.patch(`/invoices/${invoiceId}/items/${itemId}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update invoice item.");
    }

    public async removeItem(invoiceId: string, itemId: string) {
        const response = await this.client.delete(`/invoices/${invoiceId}/items/${itemId}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to remove invoice item.");
    }
}
