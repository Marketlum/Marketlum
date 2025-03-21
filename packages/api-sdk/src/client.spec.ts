import axios from "axios";
import { MarketlumClient } from "./client";

jest.mock('axios');

let client;

describe('MarketlumClient', () => {

    beforeEach(() => {
        client = new MarketlumClient("test-api-key");
    });
   
    it('should get the value streams', async () => {
        const expected = [
            {
                "id": "1",
                "name": "Value Stream 1",
                "children": [
                    {
                        "id": "1",
                        "name": "Value Stream 1.1",
                        "children": []
                    }
                ]
            }, 
            {
                "id": "2",
                "name": "Value Stream 3",
                "children": []
            }
        ];

        (axios.get as jest.Mock).mockResolvedValue({ status: 200, data: expected });

        const response = await client.getValueStreams();

        expect(response).toBe(expected);
    });

    it('should throw an error if the get request fails', async () => {
        (axios.get as jest.Mock).mockResolvedValue({ status: 500, data: { error: 'Internal server error' } });

        await expect(client.getValueStreams()).rejects.toThrow('Failed to fetch the value streams.');
    });

    it('should create a value stream', async () => {
        const expected = [
            {
                "id": "2",
                "name": "Sylius",
                "purpose": "Catalyze trade with technology",
                "children": []
            }
        ];

        (axios.post as jest.Mock).mockResolvedValue({ status: 201, data: expected });

        const response = await client.createValueStream({
            "name": "Sylius",
            "purpose": "Catalyze trade with technology",
        });

        expect(response).toBe(expected);
    });
})