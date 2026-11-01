// MOCK ORDERS SERVICE: stands in for the FastAPI endpoints (docs/INFINITE_TABLE_GATE0.md §4).
// It behaves like the server will: authoritative version, idempotency keys, the full order in every response,
// validation, readiness, a submit that freezes a snapshot, and AI proposals that only the customer can apply.
// It returns CODES, never display copy, so the UI owns wording (and Hebrew stays a strings change).
// Rules marked PLACEHOLDER are NOT business rules: they exist so the UI can be exercised (OPEN_DECISIONS #3-#5, #15).
// The order lives in memory only (lost on refresh, by design).
import { EVENT_TYPES, findDish, DISHES, source } from "./catalog.mock.js";

const clone = (v) => structuredClone(v);
const PROPOSAL_TTL_MS = 10 * 60 * 1000;
const MAX_GUESTS = 10000; // PLACEHOLDER sanity bound
const pad = (n) => String(n).padStart(2, "0");

const emptyEvent = () => ({ type: null, date: null, fulfillment: null, address: "", requestedTime: "", notes: "" });
const emptyGuests = () => ({ adults: 0, children: 0, vegetarian: 0, vegan: 0, other: 0, notes: "" });
const totalGuests = (g) => g.adults + g.children;

/** What is still missing before a quote request can be submitted. PLACEHOLDER rules (OPEN_DECISIONS #5, #15). */
export function readinessOf(order) {
  const missing = [];
  const add = (code, section) => missing.push({ code, section });
  if (!order.items.length) add("items", "menu");
  if (!order.event.type) add("event.type", "event");
  if (!order.event.date) add("event.date", "event");
  if (!order.event.fulfillment) add("event.fulfillment", "event");
  if (order.event.fulfillment === "delivery" && !order.event.address.trim()) add("event.address", "event");
  if (totalGuests(order.guests) < 1) add("guests.total", "guests");
  return { canSubmit: missing.length === 0, missing };
}

export function createMockOrdersService({ latencyMs = 250, failNextCall = false, failNextProposal = false, now = () => Date.now() } = {}) {
  let order = {
    id: "mock-order", version: 1, status: "draft", items: [],
    event: emptyEvent(), guests: emptyGuests(),
    pricing: { state: "unavailable", total: { state: "unavailable" } },
    submission: null,
  };
  const replay = new Map(); // idempotency key -> original response
  const proposals = new Map();
  let proposalSeq = 0;
  let failNext = failNextCall;
  let failProposal = failNextProposal;
  const wait = () => (latencyMs ? new Promise((r) => setTimeout(r, latencyMs)) : Promise.resolve());
  const today = () => { const d = new Date(now()); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const view = () => ({ ...clone(order), readiness: readinessOf(order) });
  const conflict = () => ({ ok: false, code: "order_version_conflict", order: view() });
  const notDraft = () => ({ ok: false, code: "order_not_editable", order: view() });
  const remember = (key, res) => { if (key && res.ok) replay.set(key, clone(res)); return res; };

  function checkQuantity(dish, quantity) {
    const rule = dish.quantityRule;
    if (rule.state !== "configured") return false;
    return Number.isInteger(quantity) && quantity >= rule.min && quantity <= rule.max && (quantity - rule.min) % rule.step === 0;
  }

  /** Field-level problems as { "event.date": "past", ... }. Codes only. */
  function validateDetails(patch, current) {
    const errors = {};
    const ev = { ...current.event, ...(patch.event ?? {}) };
    const gu = { ...current.guests, ...(patch.guests ?? {}) };
    if (patch.event) {
      if (ev.type !== null && !EVENT_TYPES.some((t) => t.id === ev.type)) errors["event.type"] = "invalid";
      if (ev.date !== null) {
        const real = typeof ev.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ev.date) && !Number.isNaN(Date.parse(ev.date));
        if (!real) errors["event.date"] = "invalid";
        else if (ev.date < today()) errors["event.date"] = "past";
      }
      if (ev.fulfillment !== null && !["pickup", "delivery"].includes(ev.fulfillment)) errors["event.fulfillment"] = "invalid";
      for (const [k, max] of [["address", 200], ["requestedTime", 40], ["notes", 500]]) {
        if (typeof ev[k] !== "string") errors[`event.${k}`] = "invalid";
        else if (ev[k].length > max) errors[`event.${k}`] = "too_long";
      }
    }
    if (patch.guests) {
      for (const k of ["adults", "children", "vegetarian", "vegan", "other"]) {
        const v = gu[k];
        if (!Number.isInteger(v)) errors[`guests.${k}`] = "not_integer";
        else if (v < 0) errors[`guests.${k}`] = "negative";
        else if (v > MAX_GUESTS) errors[`guests.${k}`] = "invalid";
      }
      // Dietary groups overlap (a guest can be in more than one), so each is checked against the total, never summed.
      for (const k of ["vegetarian", "vegan", "other"]) {
        const totalsValid = !errors["guests.adults"] && !errors["guests.children"]; // an invalid total makes the comparison meaningless
        if (!errors[`guests.${k}`] && totalsValid && gu[k] > totalGuests(gu)) errors[`guests.${k}`] = "exceeds_total";
      }
      if (typeof gu.notes !== "string") errors["guests.notes"] = "invalid";
      else if (gu.notes.length > 500) errors["guests.notes"] = "too_long";
    }
    return errors;
  }

  return {
    source,
    async getOrder() {
      await wait();
      return view();
    },

    async putItem(orderId, dishId, { quantity, version, idempotencyKey }) {
      await wait();
      if (failNext) {
        failNext = false;
        throw new Error("simulated network failure"); // one-shot, enabled with ?mockFail
      }
      if (idempotencyKey && replay.has(idempotencyKey)) return clone(replay.get(idempotencyKey));
      if (orderId !== order.id) return { ok: false, code: "not_found" };
      if (order.status !== "draft") return notDraft();
      if (version !== order.version) return conflict();
      const dish = findDish(dishId);
      if (!dish) return { ok: false, code: "not_found" };
      if (!dish.available) return { ok: false, code: "dish_unavailable", message: `${dish.name} is not available.` };
      if (!checkQuantity(dish, quantity)) return { ok: false, code: "validation_error", details: { rule: dish.quantityRule } };
      const existing = order.items.find((i) => i.dishId === dishId);
      if (existing) existing.quantity = quantity;
      else order.items.push({ dishId, quantity, pricingUnit: dish.pricingUnit });
      order.version += 1;
      return remember(idempotencyKey, { ok: true, order: view() });
    },

    async deleteItem(orderId, dishId, { version }) {
      await wait();
      if (orderId !== order.id) return { ok: false, code: "not_found" };
      if (order.status !== "draft") return notDraft();
      if (version !== order.version) return conflict();
      if (!order.items.some((i) => i.dishId === dishId)) return { ok: true, order: view() }; // already gone
      order.items = order.items.filter((i) => i.dishId !== dishId);
      order.version += 1;
      return { ok: true, order: view() };
    },

    /** PATCH /api/orders/{id}: event and/or guest details. Partial patches merge. */
    async updateDetails(orderId, patch, { version, idempotencyKey }) {
      await wait();
      if (idempotencyKey && replay.has(idempotencyKey)) return clone(replay.get(idempotencyKey));
      if (orderId !== order.id) return { ok: false, code: "not_found" };
      if (order.status !== "draft") return notDraft();
      if (version !== order.version) return conflict();
      const errors = validateDetails(patch, order);
      if (Object.keys(errors).length) return { ok: false, code: "validation_error", details: { fields: errors } };
      if (patch.event) order.event = { ...order.event, ...patch.event, address: (patch.event.address ?? order.event.address).trim(), notes: (patch.event.notes ?? order.event.notes).trim(), requestedTime: (patch.event.requestedTime ?? order.event.requestedTime).trim() };
      if (patch.guests) order.guests = { ...order.guests, ...patch.guests, notes: (patch.guests.notes ?? order.guests.notes).trim() };
      order.version += 1;
      return remember(idempotencyKey, { ok: true, order: view() });
    },

    /** POST /api/orders/{id}/submit: a quote REQUEST. Freezes a snapshot; status becomes pending_approval, never approved. */
    async submit(orderId, { version, idempotencyKey }) {
      await wait();
      if (idempotencyKey && replay.has(idempotencyKey)) return clone(replay.get(idempotencyKey));
      if (orderId !== order.id) return { ok: false, code: "not_found" };
      if (order.status !== "draft") return { ok: false, code: "invalid_transition", order: view() };
      if (version !== order.version) return conflict();
      const { canSubmit, missing } = readinessOf(order);
      if (!canSubmit) return { ok: false, code: "incomplete_order", details: { missing }, order: view() };
      order.submission = {
        submittedAt: new Date(now()).toISOString(),
        snapshot: {
          items: order.items.map((i) => ({ dishId: i.dishId, name: findDish(i.dishId)?.name ?? i.dishId, quantity: i.quantity, unitLabel: findDish(i.dishId)?.unitLabel ?? null, alcohol: !!findDish(i.dishId)?.alcohol })),
          event: clone(order.event), guests: clone(order.guests), pricing: { state: "unavailable" }, // price snapshot: still unavailable
        },
      };
      order.status = "pending_approval";
      order.version += 1;
      for (const p of proposals.values()) if (p.status === "pending") p.status = "invalid"; // nothing can apply any more
      return remember(idempotencyKey, { ok: true, order: view() });
    },

    /* ---------- AI proposals (scripted). Only these two endpoints can apply a proposal, and only the customer calls them. ---------- */

    /** POST /api/orders/{id}/proposals: a validated, server-generated proposal. Never mutates the order. */
    async createProposal(orderId) {
      await wait();
      if (failProposal) {
        failProposal = false;
        throw new Error("simulated AI timeout"); // ?mockAiFail: manual ordering must keep working
      }
      if (orderId !== order.id) return { ok: false, code: "not_found" };
      if (order.status !== "draft") return { ok: false, code: "order_not_editable", order: view() };
      const dish = DISHES.find((d) => d.available && !d.alcohol && !order.items.some((i) => i.dishId === d.id)); // never alcohol (policy undecided, #11)
      if (!dish) return { ok: false, code: "no_suggestion" };
      for (const p of proposals.values()) if (p.status === "pending") p.status = "expired"; // one pending suggestion at a time
      const proposal = {
        id: `proposal-${++proposalSeq}`, orderId, sourceOrderVersion: order.version, operation: "add_item",
        dishId: dish.id, dishName: dish.name, unitLabel: dish.unitLabel,
        before: { quantity: 0 }, after: { quantity: 1 },
        priceDelta: { state: "unavailable" }, // never invented
        status: "pending", expiresAt: new Date(now() + PROPOSAL_TTL_MS).toISOString(),
      };
      proposals.set(proposal.id, proposal);
      return { ok: true, proposal: clone(proposal) };
    },

    /** POST .../proposals/{id}/approve: applies in one step iff pending, unexpired, current version, draft, dish available. */
    async approveProposal(proposalId) {
      await wait();
      const p = proposals.get(proposalId);
      if (!p) return { ok: false, code: "not_found" };
      const fail = (code, status) => {
        if (status) p.status = status;
        return { ok: false, code, proposal: clone(p), order: view() };
      };
      if (p.status !== "pending") return fail("proposal_not_pending"); // double approval, replay, or already decided
      if (order.status !== "draft") return fail("invalid_transition", "invalid");
      if (now() > Date.parse(p.expiresAt)) return fail("proposal_expired", "expired");
      if (p.sourceOrderVersion !== order.version) return fail("order_version_conflict", "expired");
      const dish = findDish(p.dishId);
      if (!dish || !dish.available) return fail("dish_unavailable", "invalid");
      const existing = order.items.find((i) => i.dishId === p.dishId);
      if (existing) existing.quantity = p.after.quantity;
      else order.items.push({ dishId: p.dishId, quantity: p.after.quantity, pricingUnit: dish.pricingUnit });
      order.version += 1;
      p.status = "approved";
      p.executedAt = new Date(now()).toISOString();
      return { ok: true, order: view(), proposal: clone(p) };
    },

    /** POST .../proposals/{id}/reject: records the decision; the order is untouched. */
    async rejectProposal(proposalId) {
      await wait();
      const p = proposals.get(proposalId);
      if (!p) return { ok: false, code: "not_found" };
      if (p.status !== "pending") return { ok: false, code: "proposal_not_pending", proposal: clone(p), order: view() };
      p.status = "rejected";
      return { ok: true, proposal: clone(p), order: view() };
    },
  };
}
