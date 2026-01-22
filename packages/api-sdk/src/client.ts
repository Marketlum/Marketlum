import axios, { AxiosInstance, AxiosError } from "axios";

class MarketlumClient {
    private readonly client: AxiosInstance;

    constructor(
        private readonly apiKey: string,
        private readonly baseUrl: string = "https://api.marketlum.com"
    ) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;

        this.client = axios.create({
            baseURL: this.baseUrl,
        });

        // Add response interceptor for better error logging
        this.client.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                if (error.response) {
                    // Server responded with error status
                    console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
                    console.error(`  Status: ${error.response.status} ${error.response.statusText}`);
                    console.error(`  Response:`, error.response.data);
                } else if (error.request) {
                    // Request made but no response received
                    console.error(`[API Error] No response received for ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
                } else {
                    // Error setting up request
                    console.error(`[API Error] Request setup failed:`, error.message);
                }
                return Promise.reject(error);
            }
        );
    }

    public async getValueStreams() {
        const response = await this.client.get(`/value-streams`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the value streams.");
    }

    public async getValueStream(id: number) {
        const response = await this.client.get(`/value-streams/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the value stream.");
    }

    public async deleteValueStream(id: string) {
        const response = await this.client.delete(`/value-streams/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the value stream.");
    }

    public async updateValueStream(id: string, data: { name?: string, purpose?: string, imageId?: string | null }) {
        const response = await this.client.patch(`/value-streams/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the value stream.");
    }

    public async createValueStream(data: { name: string, purpose: string, parentId?: string, imageId?: string }) {
        const response = await this.client.post(`/value-streams`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the value stream.");
    }

    public async getFlatValue(streamId: number) {
        const response = await this.client.get(`/value/flat/${streamId}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the value.");
    }

    public async getValuesTree() {
        const response = await this.client.get(`/value`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch values tree.");
    }

    public async getValuesList(page: number = 1, limit: number = 10) {
        const response = await this.client.get(`/value/list`, {
            params: { page, limit }
        });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch values list.");
    }

    public async getValue(id: string) {
        const response = await this.client.get(`/value/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the value.");
    }

    public async createValue(data: { name: string; description?: string; type: string; parentType: string; parentId?: string; streamId?: string; agentId?: string; fileIds?: string[] }) {
        const response = await this.client.post(`/value`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the value.");
    }

    public async updateValue(id: string, data: { name?: string; description?: string; type?: string; parentType?: string; parentId?: string; streamId?: string; agentId?: string; fileIds?: string[] }) {
        const response = await this.client.patch(`/value/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the value.");
    }

    public async deleteValue(id: string) {
        const response = await this.client.delete(`/value/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the value.");
    }

    public async seedValues(): Promise<{ inserted: number; skipped: number }> {
        const response = await this.client.post(`/value/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed values.");
    }

    public async getAgents(page: number = 1, limit: number = 10, geographyId?: string) {
        const response = await this.client.get(`/agents`, {
            params: { page, limit, geographyId }
        });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch agents.");
    }

    public async getAgent(id: string) {
        const response = await this.client.get(`/agents/${id}`);

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
        const response = await this.client.post(`/agents`, data);

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
        const response = await this.client.patch(`/agents/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the agent.");
    }

    public async getAgentsForMap() {
        const response = await this.client.get(`/agents/map`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch agents for map.");
    }

    public async deleteAgent(id: string) {
        const response = await this.client.delete(`/agents/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the agent.");
    }

    // Channel methods

    public async getChannelsTree() {
        const response = await this.client.get(`/channels/tree`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch channels tree.");
    }

    public async getChannels(parentId?: string, type?: string) {
        const response = await this.client.get(`/channels`, {
            params: { parentId, type }
        });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch channels.");
    }

    public async getChannel(id: string) {
        const response = await this.client.get(`/channels/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the channel.");
    }

    public async createChannel(data: { name: string; type: string; purpose?: string; parentId?: string }) {
        const response = await this.client.post(`/channels`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the channel.");
    }

    public async updateChannel(id: string, data: { name?: string; type?: string; purpose?: string; parentId?: string }) {
        const response = await this.client.patch(`/channels/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the channel.");
    }

    public async moveChannel(id: string, parentId: string | null) {
        const response = await this.client.post(`/channels/${id}/move`, { parentId });

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to move the channel.");
    }

    public async deleteChannel(id: string) {
        const response = await this.client.delete(`/channels/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the channel.");
    }

    // Geography methods

    public async getGeographiesTree() {
        const response = await this.client.get(`/geographies/tree`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch geographies tree.");
    }

    public async getGeography(id: string) {
        const response = await this.client.get(`/geographies/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the geography.");
    }

    public async createGeography(data: { name: string; code: string; level: string; parentId?: string }) {
        const response = await this.client.post(`/geographies`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the geography.");
    }

    public async updateGeography(id: string, data: { name?: string; code?: string; level?: string; parentId?: string }) {
        const response = await this.client.patch(`/geographies/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the geography.");
    }

    public async moveGeography(id: string, parentId: string | null) {
        const response = await this.client.post(`/geographies/${id}/move`, { parentId });

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to move the geography.");
    }

    public async deleteGeography(id: string) {
        const response = await this.client.delete(`/geographies/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the geography.");
    }

    public async seedGeographies() {
        const response = await this.client.post(`/geographies/seed`);

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
        const response = await this.client.get(`/agreements`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch agreements.");
    }

    public async getAgreementsTree() {
        const response = await this.client.get(`/agreements/tree`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch agreements tree.");
    }

    public async getAgreementsStats(params?: { category?: string; agentId?: string }) {
        const response = await this.client.get(`/agreements/stats`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch agreements stats.");
    }

    public async getAgreement(id: string) {
        const response = await this.client.get(`/agreements/${id}`);

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
        const response = await this.client.post(`/agreements`, data);

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
        const response = await this.client.patch(`/agreements/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the agreement.");
    }

    public async deleteAgreement(id: string) {
        const response = await this.client.delete(`/agreements/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the agreement.");
    }

    public async addAgreementParty(agreementId: string, data: { agentId: string; role?: string }) {
        const response = await this.client.post(`/agreements/${agreementId}/parties`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to add party to agreement.");
    }

    public async removeAgreementParty(agreementId: string, agentId: string) {
        const response = await this.client.delete(`/agreements/${agreementId}/parties/${agentId}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to remove party from agreement.");
    }

    public async seedAgreements(): Promise<{ inserted: number; skipped: number }> {
        const response = await this.client.post(`/agreements/seed`);

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

        const response = await this.client.post(`/files`, formData, {
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

        const response = await this.client.post(`/files/upload`, formData, {
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
        const response = await this.client.get(`/files`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch files.");
    }

    public async getFile(id: string) {
        const response = await this.client.get(`/files/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the file.");
    }

    public async updateFile(id: string, data: { altText?: string | null; caption?: string | null; folderId?: string | null }) {
        const response = await this.client.patch(`/files/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the file.");
    }

    public async moveFile(id: string, folderId: string | null) {
        const response = await this.client.post(`/files/${id}/move`, { folderId });

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to move the file.");
    }

    public async deleteFile(id: string) {
        const response = await this.client.delete(`/files/${id}`);

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
        const response = await this.client.post(`/files/${id}/edit/crop`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to crop image.");
    }

    public async resizeImage(id: string, data: { width?: number; height?: number; keepAspectRatio?: boolean }) {
        const response = await this.client.post(`/files/${id}/edit/resize`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to resize image.");
    }

    public async grayscaleImage(id: string) {
        const response = await this.client.post(`/files/${id}/edit/grayscale`, {});

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to convert image to grayscale.");
    }

    // Folder methods

    public async getFoldersTree() {
        const response = await this.client.get(`/files/folders/tree`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch folders tree.");
    }

    public async getFolder(id: string) {
        const response = await this.client.get(`/files/folders/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the folder.");
    }

    public async createFolder(data: { name: string; parentId?: string }) {
        const response = await this.client.post(`/files/folders`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the folder.");
    }

    public async updateFolder(id: string, data: { name?: string }) {
        const response = await this.client.patch(`/files/folders/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the folder.");
    }

    public async deleteFolder(id: string) {
        const response = await this.client.delete(`/files/folders/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the folder.");
    }

    public async seedFiles(): Promise<{ inserted: number; skipped: number }> {
        const response = await this.client.post(`/files/seed`);

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

    public async recalculateLedgerBalances(): Promise<{ recalculatedAccounts: number }> {
        const response = await this.client.post(`/ledger/recalculate-balances`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to recalculate balances.");
    }

    public async seedLedger(): Promise<{ accounts: number; transactions: number }> {
        const response = await this.client.post(`/ledger/seed`);

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
        const response = await this.client.get(`/locales`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch locales.");
    }

    public async getLocale(id: string) {
        const response = await this.client.get(`/locales/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the locale.");
    }

    public async createLocale(data: { code: string }) {
        const response = await this.client.post(`/locales`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the locale.");
    }

    public async updateLocale(id: string, data: { code?: string }) {
        const response = await this.client.patch(`/locales/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the locale.");
    }

    public async deleteLocale(id: string) {
        const response = await this.client.delete(`/locales/${id}`);

        if (response.status === 204) {
            return true;
        }

        throw new Error("Failed to delete the locale.");
    }

    public async seedLocales(): Promise<{ inserted: number; skipped: number }> {
        const response = await this.client.post(`/locales/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed locales.");
    }

    // Auth methods

    public async login(email: string, password: string): Promise<{
        user: {
            id: string;
            email: string;
            isActive: boolean;
            agentId: string;
            defaultLocaleId: string;
            avatarFileId: string | null;
        };
        accessToken: string;
    }> {
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

    // User methods

    public async getUsers(params?: {
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

    public async getUser(id: string) {
        const response = await this.client.get(`/users/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the user.");
    }

    public async createUser(data: {
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

    public async updateUser(id: string, data: {
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

    public async setUserPassword(id: string, newPassword: string): Promise<{ ok: true }> {
        const response = await this.client.post(`/users/${id}/set-password`, { newPassword });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to set user password.");
    }

    public async deleteUser(id: string) {
        const response = await this.client.delete(`/users/${id}`);

        if (response.status === 204) {
            return true;
        }

        throw new Error("Failed to delete the user.");
    }

    public async seedUsers(): Promise<{ inserted: number; skipped: number }> {
        const response = await this.client.post(`/users/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed users.");
    }

    // Taxonomy methods

    public async getTaxonomies() {
        const response = await this.client.get(`/taxonomies`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch taxonomies.");
    }

    public async getTaxonomy(id: string) {
        const response = await this.client.get(`/taxonomies/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the taxonomy.");
    }

    public async createTaxonomy(data: {
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

    public async updateTaxonomy(id: string, data: {
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

    public async deleteTaxonomy(id: string) {
        const response = await this.client.delete(`/taxonomies/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the taxonomy.");
    }

    // Dashboard methods

    public async getDashboardStats(): Promise<{
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
    }> {
        const response = await this.client.get(`/dashboard/stats`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch dashboard stats.");
    }

    // Offering methods

    public async getOfferings(params?: {
        page?: number;
        limit?: number;
        q?: string;
        state?: 'draft' | 'live' | 'archived';
        agentId?: string;
        valueStreamId?: string;
        active?: boolean;
        sort?: string;
    }) {
        const response = await this.client.get(`/offerings`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch offerings.");
    }

    public async getOffering(id: string) {
        const response = await this.client.get(`/offerings/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the offering.");
    }

    public async createOffering(data: {
        name: string;
        description?: string;
        purpose?: string;
        link?: string;
        activeFrom?: string;
        activeUntil?: string;
        agentId: string;
        valueStreamId?: string;
    }) {
        const response = await this.client.post(`/offerings`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the offering.");
    }

    public async updateOffering(id: string, data: {
        name?: string;
        description?: string | null;
        purpose?: string | null;
        link?: string | null;
        activeFrom?: string | null;
        activeUntil?: string | null;
        agentId?: string;
        valueStreamId?: string | null;
    }) {
        const response = await this.client.patch(`/offerings/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the offering.");
    }

    public async deleteOffering(id: string) {
        const response = await this.client.delete(`/offerings/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the offering.");
    }

    public async transitionOffering(id: string, to: 'draft' | 'live' | 'archived') {
        const response = await this.client.post(`/offerings/${id}/transition`, { to });

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to transition the offering.");
    }

    public async addOfferingItem(offeringId: string, data: {
        valueId: string;
        quantity: number;
        pricingFormula?: string;
        pricingLink?: string;
    }) {
        const response = await this.client.post(`/offerings/${offeringId}/items`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to add item to offering.");
    }

    public async updateOfferingItem(offeringId: string, itemId: string, data: {
        quantity?: number;
        pricingFormula?: string;
        pricingLink?: string;
    }) {
        const response = await this.client.patch(`/offerings/${offeringId}/items/${itemId}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update offering item.");
    }

    public async removeOfferingItem(offeringId: string, itemId: string) {
        const response = await this.client.delete(`/offerings/${offeringId}/items/${itemId}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to remove item from offering.");
    }

    public async attachOfferingFile(offeringId: string, fileId: string) {
        const response = await this.client.post(`/offerings/${offeringId}/files`, { fileId });

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to attach file to offering.");
    }

    public async removeOfferingFile(offeringId: string, fileId: string) {
        const response = await this.client.delete(`/offerings/${offeringId}/files/${fileId}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to remove file from offering.");
    }

    public async seedOfferings(): Promise<{ inserted: number; skipped: number }> {
        const response = await this.client.post(`/offerings/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed offerings.");
    }

    // Exchange methods

    public async getExchanges(params?: {
        q?: string;
        state?: 'open' | 'completed' | 'closed';
        valueStreamId?: string;
        leadUserId?: string;
        channelId?: string;
        taxonId?: string;
        agentId?: string;
        sort?: string;
    }) {
        const response = await this.client.get(`/exchanges`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch exchanges.");
    }

    public async getExchange(id: string) {
        const response = await this.client.get(`/exchanges/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the exchange.");
    }

    public async createExchange(data: {
        name: string;
        purpose?: string;
        valueStreamId: string;
        channelId?: string;
        taxonId?: string;
        leadUserId?: string;
    }) {
        const response = await this.client.post(`/exchanges`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the exchange.");
    }

    public async updateExchange(id: string, data: {
        name?: string;
        purpose?: string | null;
        channelId?: string | null;
        taxonId?: string | null;
        leadUserId?: string | null;
        agreementId?: string | null;
    }) {
        const response = await this.client.patch(`/exchanges/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the exchange.");
    }

    public async deleteExchange(id: string) {
        const response = await this.client.delete(`/exchanges/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the exchange.");
    }

    public async transitionExchange(id: string, to: 'open' | 'completed' | 'closed', reason?: string) {
        const response = await this.client.post(`/exchanges/${id}/transition`, { to, reason });

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to transition the exchange.");
    }

    public async setExchangeParties(id: string, parties: Array<{ agentId: string }>) {
        const partyAgentIds = parties.map(p => p.agentId);
        const response = await this.client.put(`/exchanges/${id}/parties`, { partyAgentIds });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to set exchange parties.");
    }

    public async createExchangeFlow(exchangeId: string, data: {
        fromPartyAgentId: string;
        toPartyAgentId: string;
        valueId: string;
        quantity: number;
        note?: string;
    }) {
        const response = await this.client.post(`/exchanges/${exchangeId}/flows`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create exchange flow.");
    }

    public async updateExchangeFlow(exchangeId: string, flowId: string, data: {
        fromPartyAgentId?: string;
        toPartyAgentId?: string;
        valueId?: string;
        quantity?: number;
        note?: string | null;
    }) {
        const response = await this.client.patch(`/exchanges/${exchangeId}/flows/${flowId}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update exchange flow.");
    }

    public async removeExchangeFlow(exchangeId: string, flowId: string) {
        const response = await this.client.delete(`/exchanges/${exchangeId}/flows/${flowId}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to remove exchange flow.");
    }

    public async createAgreementFromExchange(exchangeId: string, data: {
        title: string;
        category: string;
        gateway: string;
        link?: string;
        content?: string;
    }) {
        const response = await this.client.post(`/exchanges/${exchangeId}/create-agreement`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create agreement from exchange.");
    }

    public async seedExchanges(): Promise<{ exchanges: number; flows: number }> {
        const response = await this.client.post(`/exchanges/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed exchanges.");
    }

    // Chat methods

    public async getChatModels(): Promise<{
        providers: Array<{
            id: string;
            name: string;
            models: Array<{ id: string; name: string }>;
        }>;
    }> {
        const response = await this.client.get(`/chat/models`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch chat models.");
    }

    public async getChats(q?: string) {
        const response = await this.client.get(`/chat`, { params: { q } });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch chats.");
    }

    public async getChat(id: string) {
        const response = await this.client.get(`/chat/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the chat.");
    }

    public async createChat(data: {
        title?: string;
        provider?: 'openai' | 'anthropic';
        model?: string;
    }) {
        const response = await this.client.post(`/chat`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the chat.");
    }

    public async updateChat(id: string, data: {
        title?: string;
        provider?: 'openai' | 'anthropic';
        model?: string;
    }) {
        const response = await this.client.patch(`/chat/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the chat.");
    }

    public async archiveChat(id: string) {
        const response = await this.client.delete(`/chat/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to archive the chat.");
    }

    public async getChatMessages(chatId: string) {
        const response = await this.client.get(`/chat/${chatId}/messages`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch chat messages.");
    }

    public async sendChatMessage(chatId: string, content: string): Promise<{
        userMessage: any;
        assistantMessage: any;
        toolMessages: any[];
    }> {
        const response = await this.client.post(`/chat/${chatId}/messages`, { content });

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to send chat message.");
    }

    // Value Instances methods

    public async getValueInstances(params?: {
        q?: string;
        valueId?: string;
        fromAgentId?: string;
        toAgentId?: string;
        direction?: string;
        visibility?: string;
        parentId?: string | null;
        sort?: string;
        page?: number;
        pageSize?: number;
    }) {
        const response = await this.client.get(`/value-instances`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch value instances.");
    }

    public async getValueInstancesTree(params?: {
        valueId?: string;
        visibility?: string;
    }) {
        const response = await this.client.get(`/value-instances/tree`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch value instances tree.");
    }

    public async getValueInstance(id: string) {
        const response = await this.client.get(`/value-instances/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch value instance.");
    }

    public async createValueInstance(data: {
        valueId: string;
        name: string;
        purpose?: string;
        version?: string;
        direction: string;
        fromAgentId?: string;
        toAgentId?: string;
        parentId?: string;
        link?: string;
        imageFileId?: string;
        visibility?: string;
    }) {
        const response = await this.client.post(`/value-instances`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create value instance.");
    }

    public async updateValueInstance(id: string, data: {
        valueId?: string;
        name?: string;
        purpose?: string;
        version?: string;
        direction?: string;
        fromAgentId?: string | null;
        toAgentId?: string | null;
        parentId?: string | null;
        link?: string | null;
        imageFileId?: string | null;
        visibility?: string;
    }) {
        const response = await this.client.patch(`/value-instances/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update value instance.");
    }

    public async deleteValueInstance(id: string) {
        const response = await this.client.delete(`/value-instances/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete value instance.");
    }

    public async seedValueInstances() {
        const response = await this.client.post(`/value-instances/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed value instances.");
    }

    // ==================== Invoices ====================

    public async getInvoices(params?: {
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

    public async getInvoice(id: string) {
        const response = await this.client.get(`/invoices/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch invoice.");
    }

    public async createInvoice(data: {
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

    public async updateInvoice(id: string, data: {
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

    public async deleteInvoice(id: string) {
        const response = await this.client.delete(`/invoices/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete invoice.");
    }

    public async seedInvoices() {
        const response = await this.client.post(`/invoices/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed invoices.");
    }

    // Invoice Items
    public async addInvoiceItem(invoiceId: string, data: {
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

    public async updateInvoiceItem(invoiceId: string, itemId: string, data: {
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

    public async removeInvoiceItem(invoiceId: string, itemId: string) {
        const response = await this.client.delete(`/invoices/${invoiceId}/items/${itemId}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to remove invoice item.");
    }
}

export default MarketlumClient;