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

test("the mock catalog and order never contain a calculated price", async () => {
  const { DISHES } = await import("../services/mock/catalog.mock.js");
  assert.ok(DISHES.every((d) => !isCalculated(d.price)));
  assert.ok(DISHES.every((d) => d.dietary.allergens === null && d.dietary.vegan === null && d.dietary.kashrut === null));
});
