import axios from "axios";
import MarketlumClient from "./client";

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;
let client: MarketlumClient;

const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
    interceptors: {
        response: {
            use: jest.fn(),
        },
    },
};

describe('MarketlumClient', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
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

        mockAxiosInstance.get.mockResolvedValue({ status: 200, data: expected });

        const response = await client.getValueStreams();

        expect(response).toBe(expected);
    });

    it('should throw an error if the get request fails', async () => {
        mockAxiosInstance.get.mockResolvedValue({ status: 500, data: { error: 'Internal server error' } });

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

        mockAxiosInstance.post.mockResolvedValue({ status: 201, data: expected });

        const response = await client.createValueStream({
            "name": "Sylius",
            "purpose": "Catalyze trade with technology",
        });

        expect(response).toBe(expected);
    });

    it('should create a value stream with a parent', async () => {
        const expected = [
            {
                "id": "2",
                "name": "Sylius",
                "purpose": "Catalyze trade with technology",
                "parent": {
                    "id": "1",
                    "name": "Value Stream 1",
                },
                "children": []
            }
        ];

        mockAxiosInstance.post.mockResolvedValue({ status: 201, data: expected });

        const response = await client.createValueStream({
            "name": "Sylius",
            "purpose": "Catalyze trade with technology",
            "parentId": "1"
        });

        expect(response).toBe(expected);
    });

    it('it gets a value stream by id', async () => {
        const expected = [
            {
                "id": "7c3041d7-a570-4e0c-aba8-f3490add9004",
                "name": "Sylius",
                "purpose": "Catalyze trade with technology",
                "parent": {
                    "id": "1",
                    "name": "Value Stream 1",
                },
                "children": []
            }
        ];

        mockAxiosInstance.get.mockResolvedValue({ status: 200, data: expected });

        const response = await client.getValueStream("7c3041d7-a570-4e0c-aba8-f3490add9004" as any);

        expect(response).toBe(expected);
    });

    it('it updates a value stream by id', async () => {
        mockAxiosInstance.patch.mockResolvedValue({ status: 200, data: {} });

        const response = await client.updateValueStream("7c3041d7-a570-4e0c-aba8-f3490add9004", {name: "Testing"});

        expect(response).toEqual({});
    });

    it('it deletes value stream by id', async () => {
        mockAxiosInstance.delete.mockResolvedValue({ status: 200 });

        const response = await client.deleteValueStream("7c3041d7-a570-4e0c-aba8-f3490add9004");

        expect(response).toBe(true);
    });
})
