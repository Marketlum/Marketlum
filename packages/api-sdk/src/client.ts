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

    public async updateValueStream(id: string, data: { name?: string, purpose?: string }) {
        const response = await axios.patch(`${this.baseUrl}/value-streams/${id}`, data);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to update the value stream.");
    }

    public async createValueStream(data: { name: string, purpose: string, parentId?: string }) {
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

    public async createAgent(data: { name: string; type: string; geographyId?: string }) {
        const response = await axios.post(`${this.baseUrl}/agents`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the agent.");
    }

    public async updateAgent(id: string, data: { name?: string; type?: string; geographyId?: string | null }) {
        const response = await axios.patch(`${this.baseUrl}/agents/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the agent.");
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
}

export default MarketlumClient;