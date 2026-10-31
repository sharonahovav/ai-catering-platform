// MOCK ORDERS SERVICE: stands in for the FastAPI endpoints in docs/INFINITE_TABLE_GATE0.md §4.
// It behaves like the server will: authoritative version, idempotency keys, full order in every response,
// validation of dish/availability/quantity. The order lives in memory only (lost on refresh, by design).
import { findDish, source } from "./catalog.mock.js";

const clone = (v) => structuredClone(v);

export function createMockOrdersService({ latencyMs = 250, failNextCall = false } = {}) {
  let order = { id: "mock-order", version: 1, status: "draft", items: [], pricing: { state: "unavailable", total: { state: "unavailable" } } };
  const replay = new Map(); // idempotency key -> original response
  let failNext = failNextCall;
  const wait = () => (latencyMs ? new Promise((r) => setTimeout(r, latencyMs)) : Promise.resolve());
  const conflict = () => ({ ok: false, code: "order_version_conflict", message: "Your table changed. Please try again.", order: clone(order) });

  function checkQuantity(dish, quantity) {
    const rule = dish.quantityRule;
    if (rule.state !== "configured") return "Quantity rules are not configured for this dish.";
    if (!Number.isInteger(quantity) || quantity < rule.min || quantity > rule.max || (quantity - rule.min) % rule.step !== 0) {
      return `Choose between ${rule.min} and ${rule.max}.`;
    }
    return null;
  }

  return {
    source,
    async getOrder() {
      await wait();
      return clone(order);
    },

    async putItem(orderId, dishId, { quantity, version, idempotencyKey }) {
      await wait();
      if (failNext) {
        failNext = false;
        throw new Error("simulated network failure"); // one-shot, enabled with ?mockFail
      }
      if (idempotencyKey && replay.has(idempotencyKey)) return clone(replay.get(idempotencyKey));
      if (orderId !== order.id) return { ok: false, code: "not_found", message: "Order not found." };
      if (version !== order.version) return conflict();
      const dish = findDish(dishId);
      if (!dish) return { ok: false, code: "not_found", message: "That dish no longer exists." };
      if (!dish.available) return { ok: false, code: "dish_unavailable", message: `${dish.name} is not available.` };
      const problem = checkQuantity(dish, quantity);
      if (problem) return { ok: false, code: "validation_error", message: problem };

      const existing = order.items.find((i) => i.dishId === dishId);
      if (existing) existing.quantity = quantity;
      else order.items.push({ dishId, quantity, pricingUnit: dish.pricingUnit });
      order.version += 1;
      const res = { ok: true, order: clone(order) };
      if (idempotencyKey) replay.set(idempotencyKey, clone(res));
      return res;
    },

    async deleteItem(orderId, dishId, { version }) {
      await wait();
      if (orderId !== order.id) return { ok: false, code: "not_found", message: "Order not found." };
      if (version !== order.version) return conflict();
      if (!order.items.some((i) => i.dishId === dishId)) return { ok: true, order: clone(order) }; // already gone
      order.items = order.items.filter((i) => i.dishId !== dishId);
      order.version += 1;
      return { ok: true, order: clone(order) };
    },
  };
}
