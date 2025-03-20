import axios from "axios";

export class MarketlumClient {
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
}