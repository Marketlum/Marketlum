import axios, { AxiosInstance, AxiosError } from "axios";
import {
    ValueStreamsResource,
    ValuesResource,
    AgentsResource,
    ChannelsResource,
    GeographiesResource,
    AgreementsResource,
    FilesResource,
    LedgerResource,
    LocalesResource,
    AuthResource,
    UsersResource,
    TaxonomiesResource,
    DashboardResource,
    OfferingsResource,
    ExchangesResource,
    ChatResource,
    ValueInstancesResource,
    InvoicesResource,
} from "./resources";

class MarketlumClient {
    private readonly client: AxiosInstance;
    private readonly _baseUrl: string;

    // Resource instances (lazy-loaded)
    private _valueStreams?: ValueStreamsResource;
    private _values?: ValuesResource;
    private _agents?: AgentsResource;
    private _channels?: ChannelsResource;
    private _geographies?: GeographiesResource;
    private _agreements?: AgreementsResource;
    private _files?: FilesResource;
    private _ledger?: LedgerResource;
    private _locales?: LocalesResource;
    private _auth?: AuthResource;
    private _users?: UsersResource;
    private _taxonomies?: TaxonomiesResource;
    private _dashboard?: DashboardResource;
    private _offerings?: OfferingsResource;
    private _exchanges?: ExchangesResource;
    private _chat?: ChatResource;
    private _valueInstances?: ValueInstancesResource;
    private _invoices?: InvoicesResource;

    constructor(
        private readonly apiKey: string,
        baseUrl: string = "https://api.marketlum.com"
    ) {
        this.apiKey = apiKey;
        this._baseUrl = baseUrl;

        this.client = axios.create({
            baseURL: this._baseUrl,
        });

        // Add response interceptor for better error logging
        this.client.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                if (error.response) {
                    console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
                    console.error(`  Status: ${error.response.status} ${error.response.statusText}`);
                    console.error(`  Response:`, error.response.data);
                } else if (error.request) {
                    console.error(`[API Error] No response received for ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
                } else {
                    console.error(`[API Error] Request setup failed:`, error.message);
                }
                return Promise.reject(error);
            }
        );
    }

    // ==================== Resource accessors ====================

    get valueStreams(): ValueStreamsResource {
        if (!this._valueStreams) {
            this._valueStreams = new ValueStreamsResource(this.client, this._baseUrl);
        }
        return this._valueStreams;
    }

    get values(): ValuesResource {
        if (!this._values) {
            this._values = new ValuesResource(this.client, this._baseUrl);
        }
        return this._values;
    }

    get agents(): AgentsResource {
        if (!this._agents) {
            this._agents = new AgentsResource(this.client, this._baseUrl);
        }
        return this._agents;
    }

    get channels(): ChannelsResource {
        if (!this._channels) {
            this._channels = new ChannelsResource(this.client, this._baseUrl);
        }
        return this._channels;
    }

    get geographies(): GeographiesResource {
        if (!this._geographies) {
            this._geographies = new GeographiesResource(this.client, this._baseUrl);
        }
        return this._geographies;
    }

    get agreements(): AgreementsResource {
        if (!this._agreements) {
            this._agreements = new AgreementsResource(this.client, this._baseUrl);
        }
        return this._agreements;
    }

    get files(): FilesResource {
        if (!this._files) {
            this._files = new FilesResource(this.client, this._baseUrl);
        }
        return this._files;
    }

    get ledger(): LedgerResource {
        if (!this._ledger) {
            this._ledger = new LedgerResource(this.client, this._baseUrl);
        }
        return this._ledger;
    }

    get locales(): LocalesResource {
        if (!this._locales) {
            this._locales = new LocalesResource(this.client, this._baseUrl);
        }
        return this._locales;
    }

    get auth(): AuthResource {
        if (!this._auth) {
            this._auth = new AuthResource(this.client, this._baseUrl);
        }
        return this._auth;
    }

    get users(): UsersResource {
        if (!this._users) {
            this._users = new UsersResource(this.client, this._baseUrl);
        }
        return this._users;
    }

    get taxonomies(): TaxonomiesResource {
        if (!this._taxonomies) {
            this._taxonomies = new TaxonomiesResource(this.client, this._baseUrl);
        }
        return this._taxonomies;
    }

    get dashboard(): DashboardResource {
        if (!this._dashboard) {
            this._dashboard = new DashboardResource(this.client, this._baseUrl);
        }
        return this._dashboard;
    }

    get offerings(): OfferingsResource {
        if (!this._offerings) {
            this._offerings = new OfferingsResource(this.client, this._baseUrl);
        }
        return this._offerings;
    }

    get exchanges(): ExchangesResource {
        if (!this._exchanges) {
            this._exchanges = new ExchangesResource(this.client, this._baseUrl);
        }
        return this._exchanges;
    }

    get chat(): ChatResource {
        if (!this._chat) {
            this._chat = new ChatResource(this.client, this._baseUrl);
        }
        return this._chat;
    }

    get valueInstances(): ValueInstancesResource {
        if (!this._valueInstances) {
            this._valueInstances = new ValueInstancesResource(this.client, this._baseUrl);
        }
        return this._valueInstances;
    }

    get invoices(): InvoicesResource {
        if (!this._invoices) {
            this._invoices = new InvoicesResource(this.client, this._baseUrl);
        }
        return this._invoices;
    }

    // ==================== Backward-compatible methods ====================
    // These delegate to the resource classes for backward compatibility

    // Value Streams
    public getValueStreams = () => this.valueStreams.getAll();
    public getValueStream = (id: number) => this.valueStreams.get(id);
    public deleteValueStream = (id: string) => this.valueStreams.delete(id);
    public updateValueStream = (id: string, data: Parameters<ValueStreamsResource['update']>[1]) => this.valueStreams.update(id, data);
    public createValueStream = (data: Parameters<ValueStreamsResource['create']>[0]) => this.valueStreams.create(data);
    public getValueStreamStats = (id: string) => this.valueStreams.getStats(id);

    // Values
    public getFlatValue = (streamId: number) => this.values.getFlat(streamId);
    public getValuesTree = () => this.values.getTree();
    public getValuesList = (page?: number, limit?: number, options?: Parameters<ValuesResource['getList']>[2]) => this.values.getList(page, limit, options);
    public getValue = (id: string) => this.values.get(id);
    public createValue = (data: Parameters<ValuesResource['create']>[0]) => this.values.create(data);
    public updateValue = (id: string, data: Parameters<ValuesResource['update']>[1]) => this.values.update(id, data);
    public deleteValue = (id: string) => this.values.delete(id);
    public seedValues = () => this.values.seed();

    // Agents
    public getAgents = (page?: number, limit?: number, geographyId?: string) => this.agents.getAll(page, limit, geographyId);
    public getAgent = (id: string) => this.agents.get(id);
    public createAgent = (data: Parameters<AgentsResource['create']>[0]) => this.agents.create(data);
    public updateAgent = (id: string, data: Parameters<AgentsResource['update']>[1]) => this.agents.update(id, data);
    public getAgentsForMap = () => this.agents.getForMap();
    public deleteAgent = (id: string) => this.agents.delete(id);

    // Channels
    public getChannelsTree = () => this.channels.getTree();
    public getChannels = (parentId?: string, type?: string) => this.channels.getAll(parentId, type);
    public getChannel = (id: string) => this.channels.get(id);
    public createChannel = (data: Parameters<ChannelsResource['create']>[0]) => this.channels.create(data);
    public updateChannel = (id: string, data: Parameters<ChannelsResource['update']>[1]) => this.channels.update(id, data);
    public moveChannel = (id: string, parentId: string | null) => this.channels.move(id, parentId);
    public deleteChannel = (id: string) => this.channels.delete(id);

    // Geographies
    public getGeographiesTree = () => this.geographies.getTree();
    public getGeography = (id: string) => this.geographies.get(id);
    public createGeography = (data: Parameters<GeographiesResource['create']>[0]) => this.geographies.create(data);
    public updateGeography = (id: string, data: Parameters<GeographiesResource['update']>[1]) => this.geographies.update(id, data);
    public moveGeography = (id: string, parentId: string | null) => this.geographies.move(id, parentId);
    public deleteGeography = (id: string) => this.geographies.delete(id);
    public seedGeographies = () => this.geographies.seed();

    // Agreements
    public getAgreements = (params?: Parameters<AgreementsResource['getAll']>[0]) => this.agreements.getAll(params);
    public getAgreementsTree = () => this.agreements.getTree();
    public getAgreementsStats = (params?: Parameters<AgreementsResource['getStats']>[0]) => this.agreements.getStats(params);
    public getAgreement = (id: string) => this.agreements.get(id);
    public createAgreement = (data: Parameters<AgreementsResource['create']>[0]) => this.agreements.create(data);
    public updateAgreement = (id: string, data: Parameters<AgreementsResource['update']>[1]) => this.agreements.update(id, data);
    public deleteAgreement = (id: string) => this.agreements.delete(id);
    public addAgreementParty = (agreementId: string, data: Parameters<AgreementsResource['addParty']>[1]) => this.agreements.addParty(agreementId, data);
    public removeAgreementParty = (agreementId: string, agentId: string) => this.agreements.removeParty(agreementId, agentId);
    public seedAgreements = () => this.agreements.seed();

    // Files
    public uploadFile = (file: File, folderId?: string) => this.files.upload(file, folderId);
    public uploadFiles = (files: File[], folderId?: string) => this.files.uploadMultiple(files, folderId);
    public getFiles = (params?: Parameters<FilesResource['getAll']>[0]) => this.files.getAll(params);
    public getFile = (id: string) => this.files.get(id);
    public updateFile = (id: string, data: Parameters<FilesResource['update']>[1]) => this.files.update(id, data);
    public moveFile = (id: string, folderId: string | null) => this.files.move(id, folderId);
    public deleteFile = (id: string) => this.files.delete(id);
    public getFileDownloadUrl = (id: string) => this.files.getDownloadUrl(id);
    public getFilePreviewUrl = (id: string) => this.files.getPreviewUrl(id);
    public getFileThumbnailUrl = (id: string) => this.files.getThumbnailUrl(id);
    public cropImage = (id: string, data: Parameters<FilesResource['crop']>[1]) => this.files.crop(id, data);
    public resizeImage = (id: string, data: Parameters<FilesResource['resize']>[1]) => this.files.resize(id, data);
    public grayscaleImage = (id: string) => this.files.grayscale(id);
    public getFoldersTree = () => this.files.getFoldersTree();
    public getFolder = (id: string) => this.files.getFolder(id);
    public createFolder = (data: Parameters<FilesResource['createFolder']>[0]) => this.files.createFolder(data);
    public updateFolder = (id: string, data: Parameters<FilesResource['updateFolder']>[1]) => this.files.updateFolder(id, data);
    public deleteFolder = (id: string) => this.files.deleteFolder(id);
    public seedFiles = () => this.files.seed();

    // Ledger
    public getAccounts = (params?: Parameters<LedgerResource['getAccounts']>[0]) => this.ledger.getAccounts(params);
    public getAccount = (id: string) => this.ledger.getAccount(id);
    public createAccount = (data: Parameters<LedgerResource['createAccount']>[0]) => this.ledger.createAccount(data);
    public updateAccount = (id: string, data: Parameters<LedgerResource['updateAccount']>[1]) => this.ledger.updateAccount(id, data);
    public deleteAccount = (id: string) => this.ledger.deleteAccount(id);
    public getTransactions = (params?: Parameters<LedgerResource['getTransactions']>[0]) => this.ledger.getTransactions(params);
    public getTransaction = (id: string) => this.ledger.getTransaction(id);
    public createTransaction = (data: Parameters<LedgerResource['createTransaction']>[0]) => this.ledger.createTransaction(data);
    public updateTransaction = (id: string, data: Parameters<LedgerResource['updateTransaction']>[1]) => this.ledger.updateTransaction(id, data);
    public verifyTransaction = (id: string, verified: boolean) => this.ledger.verifyTransaction(id, verified);
    public deleteTransaction = (id: string) => this.ledger.deleteTransaction(id);
    public recalculateLedgerBalances = () => this.ledger.recalculateBalances();
    public seedLedger = () => this.ledger.seed();

    // Locales
    public getLocales = (params?: Parameters<LocalesResource['getAll']>[0]) => this.locales.getAll(params);
    public getLocale = (id: string) => this.locales.get(id);
    public createLocale = (data: Parameters<LocalesResource['create']>[0]) => this.locales.create(data);
    public updateLocale = (id: string, data: Parameters<LocalesResource['update']>[1]) => this.locales.update(id, data);
    public deleteLocale = (id: string) => this.locales.delete(id);
    public seedLocales = () => this.locales.seed();

    // Auth
    public login = (email: string, password: string) => this.auth.login(email, password);
    public logout = () => this.auth.logout();
    public getMe = (token: string) => this.auth.getMe(token);
    public forgotPassword = (email: string) => this.auth.forgotPassword(email);
    public resetPassword = (token: string, newPassword: string) => this.auth.resetPassword(token, newPassword);

    // Users
    public getUsers = (params?: Parameters<UsersResource['getAll']>[0]) => this.users.getAll(params);
    public getUser = (id: string) => this.users.get(id);
    public createUser = (data: Parameters<UsersResource['create']>[0]) => this.users.create(data);
    public updateUser = (id: string, data: Parameters<UsersResource['update']>[1]) => this.users.update(id, data);
    public setUserPassword = (id: string, newPassword: string) => this.users.setPassword(id, newPassword);
    public deleteUser = (id: string) => this.users.delete(id);
    public seedUsers = () => this.users.seed();

    // Taxonomies
    public getTaxonomies = () => this.taxonomies.getAll();
    public getTaxonomy = (id: string) => this.taxonomies.get(id);
    public createTaxonomy = (data: Parameters<TaxonomiesResource['create']>[0]) => this.taxonomies.create(data);
    public updateTaxonomy = (id: string, data: Parameters<TaxonomiesResource['update']>[1]) => this.taxonomies.update(id, data);
    public deleteTaxonomy = (id: string) => this.taxonomies.delete(id);

    // Dashboard
    public getDashboardStats = () => this.dashboard.getStats();

    // Offerings
    public getOfferings = (params?: Parameters<OfferingsResource['getAll']>[0]) => this.offerings.getAll(params);
    public getOffering = (id: string) => this.offerings.get(id);
    public createOffering = (data: Parameters<OfferingsResource['create']>[0]) => this.offerings.create(data);
    public updateOffering = (id: string, data: Parameters<OfferingsResource['update']>[1]) => this.offerings.update(id, data);
    public deleteOffering = (id: string) => this.offerings.delete(id);
    public transitionOffering = (id: string, to: 'draft' | 'live' | 'archived') => this.offerings.transition(id, to);
    public addOfferingItem = (offeringId: string, data: Parameters<OfferingsResource['addItem']>[1]) => this.offerings.addItem(offeringId, data);
    public updateOfferingItem = (offeringId: string, itemId: string, data: Parameters<OfferingsResource['updateItem']>[2]) => this.offerings.updateItem(offeringId, itemId, data);
    public removeOfferingItem = (offeringId: string, itemId: string) => this.offerings.removeItem(offeringId, itemId);
    public attachOfferingFile = (offeringId: string, fileId: string) => this.offerings.attachFile(offeringId, fileId);
    public removeOfferingFile = (offeringId: string, fileId: string) => this.offerings.removeFile(offeringId, fileId);
    public seedOfferings = () => this.offerings.seed();

    // Exchanges
    public getExchanges = (params?: Parameters<ExchangesResource['getAll']>[0]) => this.exchanges.getAll(params);
    public getExchange = (id: string) => this.exchanges.get(id);
    public createExchange = (data: Parameters<ExchangesResource['create']>[0]) => this.exchanges.create(data);
    public updateExchange = (id: string, data: Parameters<ExchangesResource['update']>[1]) => this.exchanges.update(id, data);
    public deleteExchange = (id: string) => this.exchanges.delete(id);
    public transitionExchange = (id: string, to: 'open' | 'completed' | 'closed', reason?: string) => this.exchanges.transition(id, to, reason);
    public setExchangeParties = (id: string, parties: Array<{ agentId: string }>) => this.exchanges.setParties(id, parties);
    public createExchangeFlow = (exchangeId: string, data: Parameters<ExchangesResource['createFlow']>[1]) => this.exchanges.createFlow(exchangeId, data);
    public updateExchangeFlow = (exchangeId: string, flowId: string, data: Parameters<ExchangesResource['updateFlow']>[2]) => this.exchanges.updateFlow(exchangeId, flowId, data);
    public removeExchangeFlow = (exchangeId: string, flowId: string) => this.exchanges.removeFlow(exchangeId, flowId);
    public createAgreementFromExchange = (exchangeId: string, data: Parameters<ExchangesResource['createAgreement']>[1]) => this.exchanges.createAgreement(exchangeId, data);
    public seedExchanges = () => this.exchanges.seed();

    // Chat
    public getChatModels = () => this.chat.getModels();
    public getChats = (q?: string) => this.chat.getAll(q);
    public getChat = (id: string) => this.chat.get(id);
    public createChat = (data: Parameters<ChatResource['create']>[0]) => this.chat.create(data);
    public updateChat = (id: string, data: Parameters<ChatResource['update']>[1]) => this.chat.update(id, data);
    public archiveChat = (id: string) => this.chat.archive(id);
    public getChatMessages = (chatId: string) => this.chat.getMessages(chatId);
    public sendChatMessage = (chatId: string, content: string) => this.chat.sendMessage(chatId, content);

    // Value Instances
    public getValueInstances = (params?: Parameters<ValueInstancesResource['getAll']>[0]) => this.valueInstances.getAll(params);
    public getValueInstancesTree = (params?: Parameters<ValueInstancesResource['getTree']>[0]) => this.valueInstances.getTree(params);
    public getValueInstance = (id: string) => this.valueInstances.get(id);
    public createValueInstance = (data: Parameters<ValueInstancesResource['create']>[0]) => this.valueInstances.create(data);
    public updateValueInstance = (id: string, data: Parameters<ValueInstancesResource['update']>[1]) => this.valueInstances.update(id, data);
    public deleteValueInstance = (id: string) => this.valueInstances.delete(id);
    public seedValueInstances = () => this.valueInstances.seed();

    // Invoices
    public getInvoices = (params?: Parameters<InvoicesResource['getAll']>[0]) => this.invoices.getAll(params);
    public getInvoice = (id: string) => this.invoices.get(id);
    public createInvoice = (data: Parameters<InvoicesResource['create']>[0]) => this.invoices.create(data);
    public updateInvoice = (id: string, data: Parameters<InvoicesResource['update']>[1]) => this.invoices.update(id, data);
    public deleteInvoice = (id: string) => this.invoices.delete(id);
    public seedInvoices = () => this.invoices.seed();
    public addInvoiceItem = (invoiceId: string, data: Parameters<InvoicesResource['addItem']>[1]) => this.invoices.addItem(invoiceId, data);
    public updateInvoiceItem = (invoiceId: string, itemId: string, data: Parameters<InvoicesResource['updateItem']>[2]) => this.invoices.updateItem(invoiceId, itemId, data);
    public removeInvoiceItem = (invoiceId: string, itemId: string) => this.invoices.removeItem(invoiceId, itemId);
}

export default MarketlumClient;
