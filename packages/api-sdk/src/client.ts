import axios from "axios";

class MarketlumClient {
    constructor(
        private readonly apiKey: string,
        private readonly baseUrl: string = "https://api.marketlum.com"
    ) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }

    public async getValueStreams() {
        const response = await axios.get(`${this.baseUrl}/value-streams`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the value streams.");
    }

    public async getValueStream(id: number) {
        const response = await axios.get(`${this.baseUrl}/value-streams/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the value stream.");
    }

    public async deleteValueStream(id: string) {
        const response = await axios.delete(`${this.baseUrl}/value-streams/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the value stream.");
    }

    public async updateValueStream(id: string, data: { name?: string, purpose?: string, imageId?: string | null }) {
        const response = await axios.patch(`${this.baseUrl}/value-streams/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the value stream.");
    }

    public async createValueStream(data: { name: string, purpose: string, parentId?: string, imageId?: string }) {
        const response = await axios.post(`${this.baseUrl}/value-streams`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the value stream.");
    }

    public async getFlatValue(streamId: number) {
        const response = await axios.get(`${this.baseUrl}/value/flat/${streamId}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the value.");
    }

    public async getValuesTree() {
        const response = await axios.get(`${this.baseUrl}/value`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch values tree.");
    }

    public async getValuesList(page: number = 1, limit: number = 10) {
        const response = await axios.get(`${this.baseUrl}/value/list`, {
            params: { page, limit }
        });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch values list.");
    }

    public async getValue(id: string) {
        const response = await axios.get(`${this.baseUrl}/value/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the value.");
    }

    public async createValue(data: { name: string; description?: string; type: string; parentType: string; parentId?: string; streamId?: string; agentId?: string }) {
        const response = await axios.post(`${this.baseUrl}/value`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the value.");
    }

    public async updateValue(id: string, data: { name?: string; description?: string; type?: string; parentType?: string; parentId?: string; streamId?: string; agentId?: string }) {
        const response = await axios.patch(`${this.baseUrl}/value/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the value.");
    }

    public async deleteValue(id: string) {
        const response = await axios.delete(`${this.baseUrl}/value/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the value.");
    }

    public async seedValues(): Promise<{ inserted: number; skipped: number }> {
        const response = await axios.post(`${this.baseUrl}/value/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed values.");
    }

    public async getAgents(page: number = 1, limit: number = 10, geographyId?: string) {
        const response = await axios.get(`${this.baseUrl}/agents`, {
            params: { page, limit, geographyId }
        });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch agents.");
    }

    public async getAgent(id: string) {
        const response = await axios.get(`${this.baseUrl}/agents/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the agent.");
    }

    public async createAgent(data: {
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
        const response = await axios.post(`${this.baseUrl}/agents`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the agent.");
    }

    public async updateAgent(id: string, data: {
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
        const response = await axios.patch(`${this.baseUrl}/agents/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the agent.");
    }

    public async getAgentsForMap() {
        const response = await axios.get(`${this.baseUrl}/agents/map`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch agents for map.");
    }

    public async deleteAgent(id: string) {
        const response = await axios.delete(`${this.baseUrl}/agents/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the agent.");
    }

    // Channel methods

    public async getChannelsTree() {
        const response = await axios.get(`${this.baseUrl}/channels/tree`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch channels tree.");
    }

    public async getChannels(parentId?: string, type?: string) {
        const response = await axios.get(`${this.baseUrl}/channels`, {
            params: { parentId, type }
        });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch channels.");
    }

    public async getChannel(id: string) {
        const response = await axios.get(`${this.baseUrl}/channels/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the channel.");
    }

    public async createChannel(data: { name: string; type: string; purpose?: string; parentId?: string }) {
        const response = await axios.post(`${this.baseUrl}/channels`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the channel.");
    }

    public async updateChannel(id: string, data: { name?: string; type?: string; purpose?: string; parentId?: string }) {
        const response = await axios.patch(`${this.baseUrl}/channels/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the channel.");
    }

    public async moveChannel(id: string, parentId: string | null) {
        const response = await axios.post(`${this.baseUrl}/channels/${id}/move`, { parentId });

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to move the channel.");
    }

    public async deleteChannel(id: string) {
        const response = await axios.delete(`${this.baseUrl}/channels/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the channel.");
    }

    // Geography methods

    public async getGeographiesTree() {
        const response = await axios.get(`${this.baseUrl}/geographies/tree`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch geographies tree.");
    }

    public async getGeography(id: string) {
        const response = await axios.get(`${this.baseUrl}/geographies/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the geography.");
    }

    public async createGeography(data: { name: string; code: string; level: string; parentId?: string }) {
        const response = await axios.post(`${this.baseUrl}/geographies`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the geography.");
    }

    public async updateGeography(id: string, data: { name?: string; code?: string; level?: string; parentId?: string }) {
        const response = await axios.patch(`${this.baseUrl}/geographies/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the geography.");
    }

    public async moveGeography(id: string, parentId: string | null) {
        const response = await axios.post(`${this.baseUrl}/geographies/${id}/move`, { parentId });

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to move the geography.");
    }

    public async deleteGeography(id: string) {
        const response = await axios.delete(`${this.baseUrl}/geographies/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the geography.");
    }

    public async seedGeographies() {
        const response = await axios.post(`${this.baseUrl}/geographies/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed geographies.");
    }

    // Agreement methods

    public async getAgreements(params?: {
        page?: number;
        limit?: number;
        q?: string;
        category?: string;
        status?: string;
        gateway?: string;
        agentId?: string;
        sort?: string;
    }) {
        const response = await axios.get(`${this.baseUrl}/agreements`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch agreements.");
    }

    public async getAgreementsTree() {
        const response = await axios.get(`${this.baseUrl}/agreements/tree`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch agreements tree.");
    }

    public async getAgreementsStats(params?: { category?: string; agentId?: string }) {
        const response = await axios.get(`${this.baseUrl}/agreements/stats`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch agreements stats.");
    }

    public async getAgreement(id: string) {
        const response = await axios.get(`${this.baseUrl}/agreements/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the agreement.");
    }

    public async createAgreement(data: {
        title: string;
        category: string;
        gateway: string;
        link?: string;
        content?: string;
        completedAt?: string;
        parentId?: string;
        fileId?: string;
        parties?: Array<{ agentId: string; role?: string }>;
    }) {
        const response = await axios.post(`${this.baseUrl}/agreements`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the agreement.");
    }

    public async updateAgreement(id: string, data: {
        title?: string;
        category?: string;
        gateway?: string;
        link?: string | null;
        content?: string | null;
        completedAt?: string | null;
        parentId?: string | null;
        fileId?: string | null;
        parties?: Array<{ agentId: string; role?: string }>;
    }) {
        const response = await axios.patch(`${this.baseUrl}/agreements/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the agreement.");
    }

    public async deleteAgreement(id: string) {
        const response = await axios.delete(`${this.baseUrl}/agreements/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the agreement.");
    }

    public async addAgreementParty(agreementId: string, data: { agentId: string; role?: string }) {
        const response = await axios.post(`${this.baseUrl}/agreements/${agreementId}/parties`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to add party to agreement.");
    }

    public async removeAgreementParty(agreementId: string, agentId: string) {
        const response = await axios.delete(`${this.baseUrl}/agreements/${agreementId}/parties/${agentId}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to remove party from agreement.");
    }

    public async seedAgreements(): Promise<{ inserted: number; skipped: number }> {
        const response = await axios.post(`${this.baseUrl}/agreements/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed agreements.");
    }

    // File methods

    public async uploadFile(file: File, folderId?: string): Promise<any> {
        const formData = new FormData();
        formData.append('file', file);
        if (folderId) {
            formData.append('folderId', folderId);
        }

        const response = await axios.post(`${this.baseUrl}/files`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to upload file.");
    }

    public async uploadFiles(files: File[], folderId?: string): Promise<{ uploaded: any[]; failed: Array<{ originalName: string; reason: string }> }> {
        const formData = new FormData();
        for (const file of files) {
            formData.append('files', file);
        }
        if (folderId) {
            formData.append('folderId', folderId);
        }

        const response = await axios.post(`${this.baseUrl}/files/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to upload files.");
    }

    public async getFiles(params?: {
        page?: number;
        limit?: number;
        folderId?: string | null;
        q?: string;
        mimeGroup?: 'image' | 'video' | 'audio' | 'pdf' | 'doc' | 'other';
        sort?: string;
    }) {
        const response = await axios.get(`${this.baseUrl}/files`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch files.");
    }

    public async getFile(id: string) {
        const response = await axios.get(`${this.baseUrl}/files/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the file.");
    }

    public async updateFile(id: string, data: { altText?: string | null; caption?: string | null; folderId?: string | null }) {
        const response = await axios.patch(`${this.baseUrl}/files/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the file.");
    }

    public async moveFile(id: string, folderId: string | null) {
        const response = await axios.post(`${this.baseUrl}/files/${id}/move`, { folderId });

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to move the file.");
    }

    public async deleteFile(id: string) {
        const response = await axios.delete(`${this.baseUrl}/files/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the file.");
    }

    public getFileDownloadUrl(id: string): string {
        return `${this.baseUrl}/files/${id}/download`;
    }

    public getFilePreviewUrl(id: string): string {
        return `${this.baseUrl}/files/${id}/preview`;
    }

    public getFileThumbnailUrl(id: string): string {
        return `${this.baseUrl}/files/${id}/thumbnail`;
    }

    // Image editing methods

    public async cropImage(id: string, data: { x: number; y: number; width: number; height: number; outputFormat?: string }) {
        const response = await axios.post(`${this.baseUrl}/files/${id}/edit/crop`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to crop image.");
    }

    public async resizeImage(id: string, data: { width?: number; height?: number; keepAspectRatio?: boolean }) {
        const response = await axios.post(`${this.baseUrl}/files/${id}/edit/resize`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to resize image.");
    }

    public async grayscaleImage(id: string) {
        const response = await axios.post(`${this.baseUrl}/files/${id}/edit/grayscale`, {});

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to convert image to grayscale.");
    }

    // Folder methods

    public async getFoldersTree() {
        const response = await axios.get(`${this.baseUrl}/files/folders/tree`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch folders tree.");
    }

    public async getFolder(id: string) {
        const response = await axios.get(`${this.baseUrl}/files/folders/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the folder.");
    }

    public async createFolder(data: { name: string; parentId?: string }) {
        const response = await axios.post(`${this.baseUrl}/files/folders`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the folder.");
    }

    public async updateFolder(id: string, data: { name?: string }) {
        const response = await axios.patch(`${this.baseUrl}/files/folders/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the folder.");
    }

    public async deleteFolder(id: string) {
        const response = await axios.delete(`${this.baseUrl}/files/folders/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the folder.");
    }

    public async seedFiles(): Promise<{ inserted: number; skipped: number }> {
        const response = await axios.post(`${this.baseUrl}/files/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed files.");
    }

    // Ledger Account methods

    public async getAccounts(params?: {
        page?: number;
        limit?: number;
        q?: string;
        ownerAgentId?: string;
        valueId?: string;
        sort?: string;
    }) {
        const response = await axios.get(`${this.baseUrl}/ledger/accounts`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch accounts.");
    }

    public async getAccount(id: string) {
        const response = await axios.get(`${this.baseUrl}/ledger/accounts/${id}`);

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
        const response = await axios.post(`${this.baseUrl}/ledger/accounts`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the account.");
    }

    public async updateAccount(id: string, data: {
        name?: string;
        description?: string;
        ownerAgentId?: string;
        valueId?: string;
    }) {
        const response = await axios.patch(`${this.baseUrl}/ledger/accounts/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the account.");
    }

    public async deleteAccount(id: string) {
        const response = await axios.delete(`${this.baseUrl}/ledger/accounts/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the account.");
    }

    // Ledger Transaction methods

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
        const response = await axios.get(`${this.baseUrl}/ledger/transactions`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch transactions.");
    }

    public async getTransaction(id: string) {
        const response = await axios.get(`${this.baseUrl}/ledger/transactions/${id}`);

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
        const response = await axios.post(`${this.baseUrl}/ledger/transactions`, data);

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
        const response = await axios.patch(`${this.baseUrl}/ledger/transactions/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the transaction.");
    }

    public async verifyTransaction(id: string, verified: boolean) {
        const response = await axios.post(`${this.baseUrl}/ledger/transactions/${id}/verify`, { verified });

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to verify the transaction.");
    }

    public async deleteTransaction(id: string) {
        const response = await axios.delete(`${this.baseUrl}/ledger/transactions/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the transaction.");
    }

    public async recalculateLedgerBalances(): Promise<{ recalculatedAccounts: number }> {
        const response = await axios.post(`${this.baseUrl}/ledger/recalculate-balances`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to recalculate balances.");
    }

    public async seedLedger(): Promise<{ accounts: number; transactions: number }> {
        const response = await axios.post(`${this.baseUrl}/ledger/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed ledger.");
    }

    // Locale methods

    public async getLocales(params?: {
        page?: number;
        pageSize?: number;
        q?: string;
        sort?: string;
    }) {
        const response = await axios.get(`${this.baseUrl}/locales`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch locales.");
    }

    public async getLocale(id: string) {
        const response = await axios.get(`${this.baseUrl}/locales/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the locale.");
    }

    public async createLocale(data: { code: string }) {
        const response = await axios.post(`${this.baseUrl}/locales`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the locale.");
    }

    public async updateLocale(id: string, data: { code?: string }) {
        const response = await axios.patch(`${this.baseUrl}/locales/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the locale.");
    }

    public async deleteLocale(id: string) {
        const response = await axios.delete(`${this.baseUrl}/locales/${id}`);

        if (response.status === 204) {
            return true;
        }

        throw new Error("Failed to delete the locale.");
    }

    public async seedLocales(): Promise<{ inserted: number; skipped: number }> {
        const response = await axios.post(`${this.baseUrl}/locales/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed locales.");
    }
}

export default MarketlumClient;