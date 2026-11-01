// Gate 1: mock only. Gate 4 replaces this with a fetch-based client for the /api/orders endpoints,
// keeping the same method names and response shapes.
export { createMockOrdersService as createOrdersService } from "./mock/orders.mock.js";
