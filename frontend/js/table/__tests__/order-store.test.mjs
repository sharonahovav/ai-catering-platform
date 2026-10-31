import assert from "node:assert/strict";
import { test } from "node:test";
import { createOrderStore } from "../state/order-store.js";
import { createMockOrdersService } from "../services/mock/orders.mock.js";

const make = (opts = {}) => createOrderStore(createMockOrdersService({ latencyMs: 0, ...opts }));
const ready = async (opts) => {
  const store = make(opts);
  await store.load();
  return store;
};

test("starts as an empty draft with unavailable pricing", async () => {
  const o = (await ready()).getOrder();
  assert.deepEqual(o.items, []);
  assert.equal(o.status, "draft");
  assert.equal(o.pricing.state, "unavailable");
});

test("adding an item bumps the version once and returns the authoritative order", async () => {
  const store = await ready();
  const res = await store.addItem({ dishId: "hummus", quantity: 2, requestId: "a" });
  assert.equal(res.ok, true);
  assert.deepEqual(store.getOrder().items, [{ dishId: "hummus", quantity: 2, pricingUnit: null }]);
  assert.equal(store.getOrder().version, 2);
});

test("repeating the same request id never adds twice", async () => {
  const store = await ready();
  await store.addItem({ dishId: "hummus", quantity: 2, requestId: "a" });
  const again = await store.addItem({ dishId: "hummus", quantity: 2, requestId: "a" });
  assert.equal(again.replayed, true);
  assert.equal(store.getOrder().items[0].quantity, 2);
  assert.equal(store.getOrder().version, 2);
});

test("the service itself de-duplicates a replayed idempotency key", async () => {
  const svc = createMockOrdersService({ latencyMs: 0 });
  const first = await svc.putItem("mock-order", "hummus", { quantity: 1, version: 1, idempotencyKey: "k" });
  const second = await svc.putItem("mock-order", "hummus", { quantity: 1, version: 1, idempotencyKey: "k" });
  assert.deepEqual(second, first);
  assert.equal((await svc.getOrder()).version, 2);
});

test("a second dish with a new key adds to the existing quantity of the same dish", async () => {
  const store = await ready();
  await store.addItem({ dishId: "hummus", quantity: 2, requestId: "a" });
  await store.addItem({ dishId: "hummus", quantity: 3, requestId: "b" });
  assert.equal(store.getOrder().items[0].quantity, 5);
  assert.equal(store.getOrder().items.length, 1);
});

test("overlapping adds: the second is refused as busy and nothing is double-applied", async () => {
  const store = await ready();
  const [one, two] = await Promise.all([
    store.addItem({ dishId: "hummus", quantity: 1, requestId: "a" }),
    store.addItem({ dishId: "herb_salmon", quantity: 1, requestId: "b" }),
  ]);
  assert.equal(one.ok, true);
  assert.deepEqual([two.ok, two.code], [false, "busy"]);
  assert.equal(store.getOrder().items.length, 1);
});

test("unavailable, unknown and out-of-range adds are rejected and leave the order unchanged", async () => {
  const store = await ready();
  const before = JSON.stringify(store.getOrder());
  assert.equal((await store.addItem({ dishId: "pink_candies", quantity: 1, requestId: "a" })).code, "dish_unavailable");
  assert.equal((await store.addItem({ dishId: "nope", quantity: 1, requestId: "b" })).code, "not_found");
  assert.equal((await store.addItem({ dishId: "hummus", quantity: 100, requestId: "c" })).code, "validation_error");
  assert.equal(JSON.stringify(store.getOrder()), before);
});

test("a network failure leaves the order untouched and a retry with the same key succeeds once", async () => {
  const store = await ready({ failNextCall: true });
  const failed = await store.addItem({ dishId: "hummus", quantity: 1, requestId: "a" });
  assert.deepEqual([failed.ok, failed.code], [false, "network_error"]);
  assert.deepEqual(store.getOrder().items, []);
  assert.equal(store.getOrder().version, 1);
  assert.equal((await store.addItem({ dishId: "hummus", quantity: 1, requestId: "a" })).ok, true);
  assert.equal(store.getOrder().items[0].quantity, 1);
});

test("a stale version is refused and the store adopts the server's order", async () => {
  const svc = createMockOrdersService({ latencyMs: 0 });
  const store = createOrderStore(svc);
  await store.load();
  await svc.putItem("mock-order", "hummus", { quantity: 1, version: 1 }); // another tab changes the order
  const res = await store.addItem({ dishId: "herb_salmon", quantity: 1, requestId: "a" });
  assert.equal(res.code, "order_version_conflict");
  assert.equal(store.getOrder().version, 2);
  assert.equal(store.getOrder().items.length, 1);
});

test("removing an item", async () => {
  const store = await ready();
  await store.addItem({ dishId: "hummus", quantity: 1, requestId: "a" });
  assert.equal((await store.removeItem("hummus")).ok, true);
  assert.deepEqual(store.getOrder().items, []);
});

test("subscribers are notified of changes", async () => {
  const store = await ready();
  let calls = 0;
  store.subscribe(() => calls++);
  await store.addItem({ dishId: "hummus", quantity: 1, requestId: "a" });
  assert.equal(calls, 1);
});
