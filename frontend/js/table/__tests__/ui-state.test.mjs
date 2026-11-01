import assert from "node:assert/strict";
import { test } from "node:test";
import { initialState, reduce } from "../state/ui-state.js";

const RULE = { min: 1, step: 1, max: 99 };
const dishRoute = { name: "dish", categoryId: "salads", dishId: "hummus" };
const onDish = () => reduce(initialState(), { type: "NAVIGATE", route: dishRoute });

test("navigating to a dish creates a draft; leaving discards it", () => {
  const s = onDish();
  assert.deepEqual(s.draft, { dishId: "hummus", quantity: 1, status: "idle", error: null, requestId: null });
  const back = reduce(s, { type: "NAVIGATE", route: { name: "category", categoryId: "salads" } });
  assert.equal(back.draft, null);
});

test("navigating to the current route changes nothing (same object)", () => {
  const s = onDish();
  assert.equal(reduce(s, { type: "NAVIGATE", route: { ...dishRoute } }), s);
});

test("SET_QUANTITY accepts valid values and ignores invalid ones", () => {
  const s = onDish();
  assert.equal(reduce(s, { type: "SET_QUANTITY", quantity: 3, rule: RULE }).draft.quantity, 3);
  for (const bad of [0, -1, 100, 1.5, NaN, "abc"]) {
    assert.equal(reduce(s, { type: "SET_QUANTITY", quantity: bad, rule: RULE }), s, String(bad));
  }
  const stepped = { min: 2, step: 4, max: 20 };
  assert.equal(reduce(s, { type: "SET_QUANTITY", quantity: 3, rule: stepped }), s);
  assert.equal(reduce(s, { type: "SET_QUANTITY", quantity: 6, rule: stepped }).draft.quantity, 6);
});

test("quantity changes never touch an order (state has no order)", () => {
  const s = reduce(onDish(), { type: "SET_QUANTITY", quantity: 5, rule: RULE });
  assert.equal("order" in s, false);
});

test("ADD_START is only allowed from idle/error and cannot be double-fired", () => {
  const s = onDish();
  const adding = reduce(s, { type: "ADD_START", requestId: "r1" });
  assert.equal(adding.draft.status, "adding");
  assert.equal(reduce(adding, { type: "ADD_START", requestId: "r2" }), adding);
  assert.equal(reduce(initialState(), { type: "ADD_START", requestId: "r1" }).draft, null); // no draft, no add
});

test("quantity can't change while adding", () => {
  const adding = reduce(onDish(), { type: "ADD_START", requestId: "r1" });
  assert.equal(reduce(adding, { type: "SET_QUANTITY", quantity: 4, rule: RULE }), adding);
});

test("failure keeps the draft and the same request key on retry; a new quantity gets a new key", () => {
  let s = reduce(onDish(), { type: "ADD_START", requestId: "r1" });
  s = reduce(s, { type: "ADD_FAILURE", message: "Try again" });
  assert.equal(s.draft.status, "error");
  assert.equal(s.draft.error, "Try again");
  const retry = reduce(s, { type: "ADD_START", requestId: "r2" });
  assert.equal(retry.draft.requestId, "r1");
  const changed = reduce(s, { type: "SET_QUANTITY", quantity: 2, rule: RULE });
  assert.equal(changed.draft.requestId, null);
  assert.equal(reduce(changed, { type: "ADD_START", requestId: "r3" }).draft.requestId, "r3");
});

test("success clears the draft and raises a fresh notice each time", () => {
  let s = reduce(onDish(), { type: "ADD_START", requestId: "r1" });
  s = reduce(s, { type: "ADD_SUCCESS", text: "Added 2 × Hummus" });
  assert.equal(s.draft, null);
  assert.deepEqual(s.notice, { id: 1, kind: "added", text: "Added 2 × Hummus" });
  s = reduce(s, { type: "SET_NOTICE", kind: "info", text: "Same text" });
  s = reduce(s, { type: "SET_NOTICE", kind: "info", text: "Same text" });
  assert.equal(s.notice.id, 3); // distinct id so identical messages are re-announced
});

test("ADD_SUCCESS / ADD_FAILURE without an in-flight add are ignored", () => {
  const s = onDish();
  assert.equal(reduce(s, { type: "ADD_SUCCESS", text: "x" }), s);
  assert.equal(reduce(s, { type: "ADD_FAILURE", message: "x" }), s);
});

test("summary sheet opens, closes, and closes on navigation", () => {
  let s = reduce(initialState(), { type: "OPEN_SUMMARY" });
  assert.equal(s.summaryOpen, true);
  s = reduce(s, { type: "NAVIGATE", route: { name: "category", categoryId: "salads" } });
  assert.equal(s.summaryOpen, false);
});

test("explore mode is off by default and toggles without touching anything else", () => {
  const s = initialState();
  assert.equal(s.explore, false);
  const on = reduce(s, { type: "SET_EXPLORE", on: true });
  assert.equal(on.explore, true);
  assert.equal(reduce(on, { type: "SET_EXPLORE", on: true }), on);
  assert.deepEqual({ ...on, explore: false }, s);
  assert.equal(reduce(on, { type: "SET_EXPLORE", on: false }).explore, false);
});

test("unknown events are ignored", () => {
  const s = initialState();
  assert.equal(reduce(s, { type: "SOMETHING_ELSE" }), s);
});
