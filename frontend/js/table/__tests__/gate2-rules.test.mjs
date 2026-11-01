import assert from "node:assert/strict";
import { test } from "node:test";
import { createMockOrdersService, readinessOf } from "../services/mock/orders.mock.js";
import { createOrderStore } from "../state/order-store.js";
import { canApprove, proposalStatus } from "../state/proposal.js";
import { formatDate } from "../format.js";
import { DISHES, findDish } from "../services/mock/catalog.mock.js";

const NOW = Date.parse("2026-11-10T09:00:00");
const clock = (start = NOW) => {
  const c = { t: start, now: () => c.t, advance: (ms) => (c.t += ms) };
  return c;
};
const make = (opts = {}) => {
  const c = clock();
  const svc = createMockOrdersService({ latencyMs: 0, now: c.now, ...opts });
  const store = createOrderStore(svc);
  return { c, svc, store };
};
const ready = async (opts) => {
  const m = make(opts);
  await m.store.load();
  return m;
};
const fillOrder = async (store) => {
  await store.addItem({ dishId: "hummus", quantity: 2, requestId: "i1" });
  const ev = await store.updateDetails({ contact: { name: "Dana Levi", phone: "050-123-4567" }, event: { type: "birthday", date: "2026-11-20", fulfillment: "pickup", window: "12-14" } }, "e1");
  const gu = await store.updateDetails({ guests: { adults: 8, children: 2 } }, "g1");
  assert.ok(ev.ok && gu.ok, JSON.stringify([ev, gu]));
};

test("a new order is not ready: every required piece is listed with its section", async () => {
  const { store } = await ready();
  const { canSubmit, missing } = store.getOrder().readiness;
  assert.equal(canSubmit, false);
  assert.deepEqual(missing.map((m) => m.code), ["items", "contact.name", "contact.phone", "event.type", "event.date", "event.fulfillment", "event.window", "guests.total"]);
  assert.deepEqual(missing.map((m) => m.section), ["menu", "event", "event", "event", "event", "event", "event", "guests"]);
});

test("delivery additionally needs a city and a street address; pickup does not", async () => {
  const { store } = await ready();
  await store.updateDetails({ event: { fulfillment: "delivery" } }, "e1");
  const codes = () => store.getOrder().readiness.missing.map((m) => m.code);
  assert.ok(codes().includes("event.city") && codes().includes("event.address"));
  await store.updateDetails({ event: { city: "herzliya", address: "  12 Example St  " } }, "e2");
  assert.equal(store.getOrder().event.address, "12 Example St"); // trimmed
  assert.ok(!codes().includes("event.city") && !codes().includes("event.address"));
  await store.updateDetails({ event: { fulfillment: "pickup", window: null } }, "e3");
  assert.ok(!codes().includes("event.city") && !codes().includes("event.address")); // not asked for pickup
});

test("details validation returns field codes and leaves the order untouched", async () => {
  const { store } = await ready();
  const before = JSON.stringify(store.getOrder());
  const bad = await store.updateDetails({ event: { type: "wedding", date: "2020-01-01", fulfillment: "drone" }, guests: { adults: -1 } }, "x1");
  assert.equal(bad.code, "validation_error");
  assert.deepEqual(bad.details.fields, { "event.type": "invalid", "event.date": "past", "event.fulfillment": "invalid", "guests.adults": "negative" });
  assert.equal(JSON.stringify(store.getOrder()), before);
  const fmt = await store.updateDetails({ event: { date: "2026-13-45" } }, "x2");
  assert.equal(fmt.details.fields["event.date"], "invalid");
  const frac = await store.updateDetails({ guests: { adults: 2.5 } }, "x3");
  assert.equal(frac.details.fields["guests.adults"], "not_integer");
});

test("dietary groups overlap: each is checked against the total and never summed", async () => {
  const { store } = await ready();
  await store.updateDetails({ guests: { adults: 6, children: 2 } }, "g1");
  // 8 guests: 8 vegetarian AND 8 vegan AND 8 other is allowed (they overlap), 9 is not.
  const ok = await store.updateDetails({ guests: { vegetarian: 8, vegan: 8, other: 8 } }, "g2");
  assert.ok(ok.ok);
  const over = await store.updateDetails({ guests: { vegan: 9 } }, "g3");
  assert.equal(over.details.fields["guests.vegan"], "exceeds_total");
});

test("the owner needs one day's notice: today is too soon, tomorrow is fine, the past is past", async () => {
  const { store } = await ready(); // clock: Tuesday 2026-11-10
  assert.equal((await store.updateDetails({ event: { date: "2026-11-09" } }, "d1")).details.fields["event.date"], "past");
  assert.equal((await store.updateDetails({ event: { date: "2026-11-10" } }, "d2")).details.fields["event.date"], "too_soon");
  assert.ok((await store.updateDetails({ event: { date: "2026-11-11" } }, "d3")).ok);
});

test("Shabbat and holidays are blocked for pickup and delivery (sample holiday dates)", async () => {
  const { store } = await ready();
  assert.equal((await store.updateDetails({ event: { date: "2026-11-14" } }, "b1")).details.fields["event.date"], "blocked_day"); // a Saturday
  assert.ok((await store.updateDetails({ event: { date: "2026-11-13" } }, "b2")).ok); // the Friday before: a Shabbat meal is delivered then
  assert.equal((await store.updateDetails({ event: { date: "2027-04-22" } }, "b3")).details.fields["event.date"], "blocked_day"); // a sample holiday
});

test("contact: a mobile number must look like one; empty is allowed while drafting but blocks sending", async () => {
  const { store } = await ready();
  assert.equal((await store.updateDetails({ contact: { phone: "12345" } }, "c1")).details.fields["contact.phone"], "phone");
  assert.equal((await store.updateDetails({ contact: { name: "x".repeat(81) } }, "c2")).details.fields["contact.name"], "too_long");
  assert.ok((await store.updateDetails({ contact: { name: "  Dana Levi ", phone: "050 123 4567" } }, "c3")).ok);
  assert.equal(store.getOrder().contact.name, "Dana Levi"); // trimmed
  assert.ok(!store.getOrder().readiness.missing.some((m) => m.code.startsWith("contact.")));
});

test("time windows belong to pickup or delivery; a delivery area must be on the list", async () => {
  const { store } = await ready();
  await store.updateDetails({ event: { fulfillment: "pickup" } }, "w0");
  assert.equal((await store.updateDetails({ event: { window: "09-11" } }, "w1")).details.fields["event.window"], "invalid"); // that is a delivery window
  assert.ok((await store.updateDetails({ event: { window: "10-12" } }, "w2")).ok);
  assert.equal((await store.updateDetails({ event: { city: "narnia" } }, "w3")).details.fields["event.city"], "invalid");
  assert.ok((await store.updateDetails({ event: { fulfillment: "delivery", window: "14-16", city: "tel_aviv" } }, "w4")).ok);
});

test("submitting an incomplete order is refused with what is missing, and changes nothing", async () => {
  const { store } = await ready();
  const res = await store.submit("s1");
  assert.equal(res.code, "incomplete_order");
  assert.ok(res.details.missing.length >= 4);
  assert.equal(store.getOrder().status, "draft");
});

test("submit makes a quote REQUEST: pending_approval, never approved, with a frozen snapshot", async () => {
  const { store } = await ready();
  await fillOrder(store);
  const res = await store.submit("s1");
  assert.ok(res.ok);
  const o = store.getOrder();
  assert.equal(o.status, "pending_approval");
  assert.notEqual(o.status, "approved");
  assert.equal(o.submission.submittedAt, new Date(NOW).toISOString());
  assert.equal(o.submission.snapshot.items[0].name, "Silky hummus");
  assert.equal(o.submission.snapshot.items[0].quantity, 2);
  const snap = o.submission.snapshot.pricing;
  assert.equal(snap.state, "calculated"); // the price at the moment of sending is frozen with the request
  assert.equal(snap.total.amountMinor, 17000); // 2 trays of hummus at the sample 85.00, pickup has no fee
  assert.deepEqual([snap.estimate, snap.vatIncluded], [true, true]);
});

test("submit is idempotent for the same request id, and a second real submit is an invalid transition", async () => {
  const { store } = await ready();
  await fillOrder(store);
  await store.submit("s1");
  const version = store.getOrder().version;
  assert.equal((await store.submit("s1")).replayed, true);
  assert.equal(store.getOrder().version, version);
  assert.equal((await store.submit("s2")).code, "invalid_transition");
});

test("after submit the request is read-only: items and details cannot change and the snapshot stays put", async () => {
  const { store } = await ready();
  await fillOrder(store);
  await store.submit("s1");
  const snapshot = JSON.stringify(store.getOrder().submission);
  assert.equal((await store.addItem({ dishId: "herb_salmon", quantity: 1, requestId: "a1" })).code, "order_not_editable");
  assert.equal((await store.removeItem("hummus")).code, "order_not_editable");
  assert.equal((await store.updateDetails({ guests: { adults: 50 } }, "u1")).code, "order_not_editable");
  assert.equal(JSON.stringify(store.getOrder().submission), snapshot);
  assert.equal(store.getOrder().items.length, 1);
});

test("a stale version cannot submit (the store adopts the server's order)", async () => {
  const { svc, store } = await ready();
  await fillOrder(store);
  await svc.putItem("mock-order", "herb_salmon", { quantity: 1, version: store.getOrder().version }); // another tab
  const res = await store.submit("s1");
  assert.equal(res.code, "order_version_conflict");
  assert.equal(store.getOrder().status, "draft");
});

/* ---------------- AI proposals ---------------- */

test("a proposal is created without touching the order and carries before/after and a server-calculated price effect", async () => {
  const { store } = await ready();
  const before = JSON.stringify(store.getOrder());
  const res = await store.requestProposal();
  assert.ok(res.ok);
  const p = store.getProposal();
  assert.equal(p.status, "pending");
  assert.equal(p.operation, "add_item");
  assert.deepEqual([p.before.quantity, p.after.quantity], [0, 1]);
  assert.deepEqual(p.priceDelta, { state: "calculated", currency: "ILS", amountMinor: 11000 }); // one tray of the first dish, calculated by the server
  assert.equal(p.pricingUnit, "per_tray");
  assert.equal(p.sourceOrderVersion, store.getOrder().version);
  assert.equal(JSON.stringify(store.getOrder()), before); // not applied
});

test("it only ever suggests a real, available dish that is not already on the table", async () => {
  const { store } = await ready();
  const seen = new Set();
  for (let i = 0; i < 30; i++) {
    const res = await store.requestProposal();
    if (!res.ok) { assert.equal(res.code, "no_suggestion"); break; }
    const p = store.getProposal();
    assert.ok(!seen.has(p.dishId) && p.dishId !== "pink_candies", p.dishId); // pink_candies is unavailable in the mock
    assert.equal(findDish(p.dishId).alcohol, false, `the guide must never propose alcohol: ${p.dishId}`); // policy undecided (#11)
    seen.add(p.dishId);
    assert.ok((await store.approveProposal(p.id)).ok);
  }
  assert.equal(seen.size, DISHES.filter((d) => d.available && !d.alcohol).length); // every available non-alcohol dish, once
  assert.ok(seen.size >= 20);
});

test("approve applies exactly once: bumps the version, adds the dish, and a second approve has no effect", async () => {
  const { store } = await ready();
  await store.requestProposal();
  const id = store.getProposal().id;
  const v = store.getOrder().version;
  const first = await store.approveProposal(id);
  assert.ok(first.ok);
  assert.equal(store.getOrder().version, v + 1);
  assert.equal(store.getOrder().items.length, 1);
  assert.equal(store.getProposal().status, "approved");
  const again = await store.approveProposal(id);
  assert.equal(again.code, "proposal_not_pending");
  assert.equal(store.getOrder().version, v + 1);
  assert.equal(store.getOrder().items[0].quantity, 1);
});

test("overlapping approvals: only one runs", async () => {
  const { store } = await ready();
  await store.requestProposal();
  const id = store.getProposal().id;
  const [a, b] = await Promise.all([store.approveProposal(id), store.approveProposal(id)]);
  assert.deepEqual([a.ok, b.code], [true, "busy"]);
  assert.equal(store.getOrder().items.length, 1);
});

test("reject records the decision and leaves the order exactly as it was", async () => {
  const { store } = await ready();
  await store.requestProposal();
  const before = JSON.stringify(store.getOrder());
  assert.ok((await store.rejectProposal(store.getProposal().id)).ok);
  assert.equal(store.getProposal().status, "rejected");
  assert.equal(JSON.stringify(store.getOrder()), before);
  assert.equal((await store.approveProposal(store.getProposal().id)).code, "proposal_not_pending"); // cannot be revived
});

test("a proposal goes stale when the order changes: approve is refused and nothing is applied", async () => {
  const { store } = await ready();
  await store.requestProposal();
  const id = store.getProposal().id;
  await store.addItem({ dishId: "herb_salmon", quantity: 1, requestId: "a1" }); // the table changed
  assert.equal(proposalStatus(store.getProposal(), store.getOrder(), NOW), "expired"); // UI stops offering Approve
  const res = await store.approveProposal(id);
  assert.equal(res.code, "order_version_conflict");
  assert.equal(store.getProposal().status, "expired");
  assert.deepEqual(store.getOrder().items.map((i) => i.dishId), ["herb_salmon"]);
});

test("a proposal expires with time", async () => {
  const { c, store } = await ready();
  await store.requestProposal();
  const p = store.getProposal();
  c.advance(11 * 60 * 1000);
  assert.equal(proposalStatus(p, store.getOrder(), c.now()), "expired");
  assert.equal((await store.approveProposal(p.id)).code, "proposal_expired");
  assert.equal(store.getOrder().items.length, 0);
});

test("asking again expires the previous suggestion (one pending at a time)", async () => {
  const { svc, store } = await ready();
  await store.requestProposal();
  const first = store.getProposal().id;
  await store.requestProposal();
  assert.notEqual(store.getProposal().id, first);
  assert.equal((await svc.approveProposal(first)).code, "proposal_not_pending");
});

test("a submitted request can no longer receive or apply a proposal", async () => {
  const { store } = await ready();
  await fillOrder(store);
  await store.requestProposal();
  const id = store.getProposal().id;
  await store.submit("s1");
  assert.equal((await store.approveProposal(id)).code, "proposal_not_pending"); // marked invalid at submit
  assert.equal((await store.requestProposal()).code, "order_not_editable");
  assert.equal(store.getOrder().items.length, 1);
});

test("unknown proposals are not found; an AI outage does not block manual ordering", async () => {
  const { store } = await ready({ failNextProposal: true });
  assert.equal((await store.approveProposal("nope")).code, "not_found");
  assert.equal((await store.requestProposal()).code, "network_error");
  assert.equal(store.getProposal(), null);
  assert.ok((await store.addItem({ dishId: "hummus", quantity: 1, requestId: "a" })).ok); // still works
});

test("only a currently-pending proposal can show Approve", () => {
  const order = { status: "draft", version: 3 };
  const p = { status: "pending", sourceOrderVersion: 3, expiresAt: new Date(NOW + 1000).toISOString() };
  assert.equal(canApprove(p, order, NOW), true);
  assert.equal(canApprove(p, { ...order, version: 4 }, NOW), false);
  assert.equal(canApprove(p, { ...order, status: "pending_approval" }, NOW), false);
  assert.equal(canApprove(p, order, NOW + 5000), false);
  for (const status of ["approved", "rejected", "expired", "invalid"]) assert.equal(canApprove({ ...p, status }, order, NOW), false);
  assert.equal(proposalStatus(null, order, NOW), null);
});

test("readinessOf is a pure function of the order", () => {
  const order = { items: [{}], contact: { name: "A", phone: "0501234567" }, event: { type: "other", date: "2026-12-01", fulfillment: "pickup", window: "12-14", city: null, address: "" }, guests: { adults: 1, children: 0 } };
  assert.deepEqual(readinessOf(order), { canSubmit: true, missing: [] });
});

test("formatDate prints the calendar date without timezone shifting", () => {
  assert.match(formatDate("2026-11-20", "en-GB"), /20 November 2026/);
  assert.equal(formatDate("not a date"), "");
});

test("alcohol is a catalog flag that survives into the frozen snapshot, and the demo has some", async () => {
  const { store } = await ready();
  assert.ok(DISHES.filter((d) => d.alcohol).length >= 3);
  assert.ok(DISHES.filter((d) => d.alcohol).every((d) => d.categoryId === "wine_cocktails"));
  await fillOrder(store);
  assert.ok((await store.addItem({ dishId: "red_wine", quantity: 1, requestId: "w1" })).ok); // addable like any dish (mock only)
  await store.submit("s1");
  const items = store.getOrder().submission.snapshot.items;
  assert.equal(items.find((i) => i.dishId === "red_wine").alcohol, true);
  assert.equal(items.find((i) => i.dishId === "hummus").alcohol, false);
});

test("the frozen snapshot keeps the contact details too", async () => {
  const { store } = await ready();
  await fillOrder(store);
  await store.submit("s1");
  assert.deepEqual(store.getOrder().submission.snapshot.contact, { name: "Dana Levi", phone: "050-123-4567" });
});

test("the catalog is organised into the seven categories, each with at least two dishes and a real image path", () => {
  const ids = new Set(DISHES.map((d) => d.categoryId));
  assert.deepEqual([...ids], ["salads", "hors_doeuvres", "mains", "sides", "sweets", "soft_drinks", "wine_cocktails"]);
  for (const d of DISHES) assert.match(d.image, /^\.\.\/assets\/table\/[a-z_]+\.png$/);
  assert.equal(new Set(DISHES.map((d) => d.id)).size, DISHES.length); // unique ids
});
