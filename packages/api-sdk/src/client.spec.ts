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

        const valueStreams = await client.getValueStreams();

        expect(valueStreams).toBe(expected);
    });

    it('should throw an error if the request fails', async () => {
        (axios.get as jest.Mock).mockResolvedValue({ status: 500, data: { error: 'Internal server error' } });

        await expect(client.getValueStreams()).rejects.toThrow('Failed to fetch the value streams.');
    });
})