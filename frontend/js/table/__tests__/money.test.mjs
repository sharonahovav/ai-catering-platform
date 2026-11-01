import assert from "node:assert/strict";
import { test } from "node:test";
import { formatMoney, isCalculated } from "../money.js";

const TEXT = "Not available yet";

test("only a calculated Money produces a number", () => {
  const shown = formatMoney({ state: "calculated", currency: "ILS", amountMinor: 8400 }, TEXT, "en-US");
  assert.match(shown, /84\.00/); // symbol comes from Intl (₪); the amount is minor units / 100
  assert.notEqual(shown, TEXT);
  for (const m of [undefined, null, {}, { state: "unavailable" }, { state: "calculated" }, { state: "calculated", currency: "ILS" }, { state: "calculated", currency: "ILS", amountMinor: 8.4 }, { state: "calculated", currency: "ILS", amountMinor: "8400" }]) {
    assert.equal(formatMoney(m, TEXT), TEXT);
    assert.equal(isCalculated(m), false);
  }
});

test("zero is shown only when the backend calculated zero, never as a fallback", () => {
  assert.equal(formatMoney({ state: "unavailable", amountMinor: 0, currency: "ILS" }, TEXT), TEXT);
});

test("compact drops .00 on whole amounts; signed shows a plus", () => {
  const m = (amountMinor) => ({ state: "calculated", currency: "ILS", amountMinor });
  assert.equal(formatMoney(m(8500), TEXT, "en-US", { compact: true }), "₪85");
  assert.equal(formatMoney(m(8550), TEXT, "en-US", { compact: true }), "₪85.50"); // never rounds a real amount away
  assert.equal(formatMoney(m(11000), TEXT, "en-US", { compact: true, signed: true }), "+₪110");
  assert.equal(formatMoney({ state: "unavailable" }, TEXT, "en-US", { signed: true }), TEXT);
});

test("every sample dish has a calculated price in a real unit, and a valid quantity rule", async () => {
  const { DISHES } = await import("../services/mock/catalog.mock.js");
  assert.ok(DISHES.length >= 20);
  for (const d of DISHES) {
    assert.ok(isCalculated(d.price), d.id);
    assert.ok(["per_tray", "per_item", "per_weight"].includes(d.pricingUnit), d.id); // the owner's units (per guest is not used)
    const r = d.quantityRule;
    assert.ok(r.min >= 1 && r.step >= 1 && r.max >= r.min && (r.max - r.min) % r.step === 0, `${d.id} rule`);
  }
  assert.ok(DISHES.some((d) => d.pricingUnit === "per_weight"));
});
