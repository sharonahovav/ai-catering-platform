import assert from "node:assert/strict";
import { test } from "node:test";
import { buildHash, decideUp, parseHash, sameRoute } from "../state/router.js";

test("parses the supported routes", () => {
  assert.deepEqual(parseHash(""), { name: "overview" });
  assert.deepEqual(parseHash("#/plan"), { name: "overview" });
  assert.deepEqual(parseHash("#/plan/"), { name: "overview" });
  assert.deepEqual(parseHash("#/plan/menu/salads"), { name: "category", categoryId: "salads" });
  assert.deepEqual(parseHash("#/plan/menu/salads/dish/hummus"), { name: "dish", categoryId: "salads", dishId: "hummus" });
  assert.deepEqual(parseHash("#/plan/review"), { name: "review" });
});

test("build and parse round-trip", () => {
  for (const route of [
    { name: "overview" },
    { name: "category", categoryId: "mains" },
    { name: "dish", categoryId: "mains", dishId: "herb_salmon" },
    { name: "event" },
  ]) {
    assert.ok(sameRoute(parseHash(buildHash(route)), route), buildHash(route));
  }
});

test("rejects malformed or hostile ids instead of throwing", () => {
  for (const bad of [
    "#/plan/menu/",
    "#/plan/menu/a b",
    "#/plan/menu/<script>",
    "#/plan/menu/../../x",
    "#/plan/menu/salads/dish/",
    "#/plan/menu/salads/other/x",
    "#/nope",
    "#/plan/menu/salads/dish/x/extra",
  ]) {
    assert.equal(parseHash(bad).name, "notfound", bad);
  }
});

test("decideUp pops only when the previous entry is the target", () => {
  const cat = { name: "category", categoryId: "salads" };
  assert.equal(decideUp({ i: 2, prev: "#/plan/menu/salads" }, cat), "back");
  assert.equal(decideUp({ i: 1, prev: "#/plan" }, cat, "replace"), "replace");
  assert.equal(decideUp({ i: 0, prev: "#/plan/menu/salads" }, cat, "replace"), "replace"); // first entry: nothing to pop
  assert.equal(decideUp(null, cat, "push"), "push"); // deep link / hand-edited URL
});
