import { MarketlumClient } from "../../../packages/api-sdk/src/client";

const client = new MarketlumClient("test-api-key", "http://localhost:3001");

export default client;