import { AxiosInstance } from "axios";
import { BaseResource } from "./base";

export class LedgerResource extends BaseResource {
    constructor(client: AxiosInstance, baseUrl: string) {
        super(client, baseUrl);
    }

    // Account methods

    public async getAccounts(params?: {
        page?: number;
        limit?: number;
        q?: string;
        ownerAgentId?: string;
        valueId?: string;
        sort?: string;
    }) {
        const response = await this.client.get(`/ledger/accounts`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch accounts.");
    }

    public async getAccount(id: string) {
        const response = await this.client.get(`/ledger/accounts/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the account.");
    }

    public async createAccount(data: {
        name: string;
        ownerAgentId: string;
        valueId: string;
        description?: string;
    }) {
        const response = await this.client.post(`/ledger/accounts`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the account.");
    }

    public async updateAccount(id: string, data: {
        name?: string;
        description?: string;
        valueId?: string;
    }) {
        const response = await this.client.patch(`/ledger/accounts/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the account.");
    }

    public async deleteAccount(id: string) {
        const response = await this.client.delete(`/ledger/accounts/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the account.");
    }

    // Transaction methods

    public async getTransactions(params?: {
        page?: number;
        limit?: number;
        accountId?: string;
        fromAccountId?: string;
        toAccountId?: string;
        verified?: boolean;
        dateFrom?: string;
        dateTo?: string;
        minAmount?: number;
        maxAmount?: number;
        q?: string;
        sort?: string;
    }) {
        const response = await this.client.get(`/ledger/transactions`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch transactions.");
    }

    public async getTransaction(id: string) {
        const response = await this.client.get(`/ledger/transactions/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the transaction.");
    }

    public async createTransaction(data: {
        fromAccountId: string;
        toAccountId: string;
        amount: number;
        timestamp?: string;
        verified?: boolean;
        note?: string;
    }) {
        const response = await this.client.post(`/ledger/transactions`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the transaction.");
    }

    public async updateTransaction(id: string, data: {
        fromAccountId?: string;
        toAccountId?: string;
        amount?: number;
        timestamp?: string;
        verified?: boolean;
        note?: string;
    }) {
        const response = await this.client.patch(`/ledger/transactions/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the transaction.");
    }

    public async verifyTransaction(id: string, verified: boolean) {
        const response = await this.client.post(`/ledger/transactions/${id}/verify`, { verified });

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to verify the transaction.");
    }

    public async deleteTransaction(id: string) {
        const response = await this.client.delete(`/ledger/transactions/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the transaction.");
    }

    public async recalculateBalances(): Promise<{ recalculatedAccounts: number }> {
        const response = await this.client.post(`/ledger/recalculate-balances`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to recalculate balances.");
    }

    public async seed(): Promise<{ accounts: number; transactions: number }> {
        const response = await this.client.post(`/ledger/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed ledger.");
    }
}
