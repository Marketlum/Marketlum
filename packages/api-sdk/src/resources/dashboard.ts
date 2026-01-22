import { AxiosInstance } from "axios";
import { BaseResource } from "./base";

export interface DashboardStats {
    agents: {
        total: number;
        byType: {
            individual: number;
            organization: number;
            virtual: number;
        };
        withLocation: number;
    };
    agreements: {
        total: number;
        open: number;
        completed: number;
    };
    values: {
        total: number;
        byType: {
            product: number;
            service: number;
            relationship: number;
            right: number;
        };
    };
    valueStreams: {
        total: number;
    };
    users: {
        total: number;
        active: number;
        inactive: number;
    };
    files: {
        total: number;
        totalSizeBytes: number;
    };
    ledger: {
        accounts: number;
        transactions: number;
        verifiedTransactions: number;
    };
    geographies: {
        total: number;
    };
    taxonomies: {
        total: number;
    };
    channels: {
        total: number;
    };
}

export class DashboardResource extends BaseResource {
    constructor(client: AxiosInstance, baseUrl: string) {
        super(client, baseUrl);
    }

    public async getStats(): Promise<DashboardStats> {
        const response = await this.client.get(`/dashboard/stats`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch dashboard stats.");
    }
}
