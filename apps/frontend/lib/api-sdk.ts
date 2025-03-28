import MarketlumClient from "@marketlum/api-sdk";

console.log(MarketlumClient);
const client = new MarketlumClient("test-api-key", "http://localhost:3001");

export default client;