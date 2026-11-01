import assert from "node:assert/strict";
import { test } from "node:test";
import { createMockOrdersService, pricingOf } from "../services/mock/orders.mock.js";
import { createOrderStore } from "../state/order-store.js";
import { t } from "../strings.en.js";
import { perUnit, qtyLabel } from "../units.js";

const NOW = Date.parse("2026-11-10T09:00:00");
const ready = async () => {
  const store = createOrderStore(createMockOrdersService({ latencyMs: 0, now: () => NOW }));
  await store.load();
  return store;
};
const add = (store, dishId, quantity, requestId = `${dishId}-${quantity}`) => store.addItem({ dishId, quantity, requestId });
const total = (store) => store.getOrder().pricing.total.amountMinor;

test("an empty order has no price (never 0)", async () => {
  const store = await ready();
  assert.equal(store.getOrder().pricing.state, "unavailable");
  assert.equal(store.getOrder().pricing.total.state, "unavailable");
});

test("prices are line quantity x unit price, summed by the server, VAT included, marked as an estimate", async () => {
  const store = await ready();
  await add(store, "hummus", 2); // 2 trays x 85.00
  await add(store, "bruschetta", 12); // 12 pieces x 9.00
  const p = store.getOrder().pricing;
  assert.deepEqual(p.lines.map((l) => [l.dishId, l.lineTotal.amountMinor]), [["hummus", 17000], ["bruschetta", 10800]]);
  assert.equal(p.subtotal.amountMinor, 27800);
  assert.deepEqual([p.estimate, p.vatIncluded], [true, true]);
});

test("weight is priced per 100 g and counts in 500 g steps", async () => {
  const store = await ready();
  assert.equal((await add(store, "sauteed_mushrooms", 3)).code, "validation_error"); // 300 g is under the 500 g minimum
  assert.equal((await add(store, "sauteed_mushrooms", 7)).code, "validation_error"); // not a 500 g step
  assert.ok((await add(store, "sauteed_mushrooms", 10)).ok); // 1 kg
  assert.equal(total(store), 16000); // 10 x 16.00
});

test("pieces follow their own steps (bruschetta in sixes)", async () => {
  const store = await ready();
  assert.equal((await add(store, "bruschetta", 7)).code, "validation_error");
  assert.ok((await add(store, "bruschetta", 6)).ok);
});

test("pickup has no delivery fee; delivery uses the chosen area's fixed fee; before an area is chosen the fee is unknown, not zero", async () => {
  const store = await ready();
  await add(store, "herb_salmon", 3); // 3 x 200.00 = 600.00 (over the delivery minimum)
  assert.equal(store.getOrder().pricing.deliveryFee.state, "unavailable"); // nothing chosen yet
  assert.equal(store.getOrder().pricing.totalIncludesDelivery, false);
  await store.updateDetails({ event: { fulfillment: "pickup" } }, "p1");
  assert.deepEqual(store.getOrder().pricing.deliveryFee, { state: "calculated", currency: "ILS", amountMinor: 0 });
  assert.equal(total(store), 60000);
  await store.updateDetails({ event: { fulfillment: "delivery" } }, "p2");
  assert.equal(store.getOrder().pricing.deliveryFee.state, "unavailable"); // delivery but no area yet
  await store.updateDetails({ event: { city: "herzliya" } }, "p3");
  assert.equal(store.getOrder().pricing.deliveryFee.amountMinor, 9000);
  assert.equal(total(store), 69000);
  await store.updateDetails({ event: { city: "tel_aviv" } }, "p4");
  assert.equal(total(store), 66000); // a different fixed fee per area
});

test("the delivery minimum applies to delivery only", async () => {
  const store = await ready();
  await add(store, "hummus", 2); // 170.00: under the sample 500.00 minimum
  await store.updateDetails({ event: { fulfillment: "pickup" } }, "m1");
  assert.ok(!store.getOrder().readiness.missing.some((m) => m.code === "delivery.minimum"));
  await store.updateDetails({ event: { fulfillment: "delivery" } }, "m2");
  assert.ok(store.getOrder().readiness.missing.some((m) => m.code === "delivery.minimum"));
  await add(store, "herb_salmon", 2); // + 400.00 => 570.00
  assert.ok(!store.getOrder().readiness.missing.some((m) => m.code === "delivery.minimum"));
});

test("removing an item re-prices the order", async () => {
  const store = await ready();
  await add(store, "hummus", 1);
  await add(store, "lemonade", 2);
  assert.equal(total(store), 8500 + 9000);
  await store.removeItem("lemonade");
  assert.equal(total(store), 8500);
});

test("approving a suggestion changes the total by exactly the price effect that was shown", async () => {
  const store = await ready();
  for (let i = 0; i < 6; i++) {
    await store.requestProposal();
    const p = store.getProposal();
    assert.equal(p.priceDelta.state, "calculated");
    const before = store.getOrder().pricing.total.amountMinor ?? 0; // an empty order has no total yet
    assert.ok((await store.approveProposal(p.id)).ok);
    assert.equal(total(store) - before, p.priceDelta.amountMinor, p.dishName);
  }
});

test("pricingOf is pure: the same order always gives the same numbers", () => {
  const order = { items: [{ dishId: "hummus", quantity: 3 }], event: { fulfillment: "delivery", city: "givatayim" } };
  assert.deepEqual(pricingOf(order), pricingOf(order));
  assert.equal(pricingOf(order).total.amountMinor, 3 * 8500 + 6000);
});

test("unit wording: trays, pieces, and grams or kilograms for weight", () => {
  assert.equal(qtyLabel(t, "per_tray", 1), "1 tray");
  assert.equal(qtyLabel(t, "per_tray", 3), "3 trays");
  assert.equal(qtyLabel(t, "per_item", 6), "6 pieces");
  assert.equal(qtyLabel(t, "per_weight", 5), "500 g");
  assert.equal(qtyLabel(t, "per_weight", 10), "1 kg");
  assert.equal(qtyLabel(t, "per_weight", 15), "1.5 kg");
  assert.equal(perUnit(t, "per_weight"), "per 100 g");
});
