import { h, fill } from "../../lib/dom.js";
import { formatDate, formatDateTime } from "../format.js";

const ROUTE = { menu: "#/plan", event: "#/plan/event", guests: "#/plan/guests" };

// The review page. While the order is a draft it shows live details and what is still missing; once sent it shows
// the frozen snapshot and says "pending business approval". Nothing on this page ever says "confirmed".
export function renderQuoteReview(root, { t, order, eventTypes, settings, dishesById, submitting, submitError, onSubmit }) {
  const pending = order.status === "pending_approval";
  const snap = pending ? order.submission.snapshot : null;
  const items = pending ? snap.items.map((i) => ({ name: i.name, quantity: i.quantity })) : order.items.map((i) => ({ name: dishesById.get(i.dishId)?.name ?? i.dishId, quantity: i.quantity }));
  const ev = pending ? snap.event : order.event;
  const ct = pending ? snap.contact : order.contact;
  const cityName = settings.cities.find((c) => c.id === ev.city)?.name;
  const windowLabel = (settings.windows[ev.fulfillment] ?? []).find((w) => w.id === ev.window)?.label;
  const gu = pending ? snap.guests : order.guests;
  const typeName = eventTypes.find((e) => e.id === ev.type)?.name;
  const hasAlcohol = pending ? snap.items.some((i) => i.alcohol) : order.items.some((i) => dishesById.get(i.dishId)?.alcohol);
  const { canSubmit, missing } = order.readiness;

  const heading = h("h2", { id: "page-heading", tabindex: "-1" }, t.check.title);
  const L = t.check.labels;
  const row = (label, value) => [h("dt", null, label), h("dd", null, value || h("span", { class: "muted" }, t.check.notSet))];
  const edit = (section, text) => (pending ? null : h("a", { class: "edit-link", href: ROUTE[section] }, text));

  const banner = h(
    "div",
    { class: "status-banner", "data-state": pending ? "pending" : "draft" },
    h("p", { class: "status-title" }, h("span", { "aria-hidden": "true", class: "status-mark" }, pending ? "◔" : "○"), " ", pending ? t.check.statusPending : t.check.statusDraft),
    h("p", null, pending ? t.check.statusPendingNote(formatDateTime(order.submission.submittedAt)) : t.check.statusDraftNote),
  );

  const missingHeading = h("h3", { tabindex: "-1" }, t.check.missingTitle);
  const missingBox =
    !pending && !canSubmit
      ? h("section", { class: "missing", "aria-labelledby": "missing-title" }, missingHeading, h("ul", null, missing.map((m) => h("li", null, h("a", { href: ROUTE[m.section] }, t.check.missing[m.code] ?? m.code)))))
      : null;
  if (missingBox) missingHeading.id = "missing-title";

  const blocked = pending || !canSubmit || submitting;
  const submit = h(
    "button",
    { class: "btn btn-primary", type: "button", id: "submit-request", "aria-disabled": String(blocked), "aria-describedby": "submit-note", onclick: () => {
      if (submit.getAttribute("aria-disabled") === "true") { if (!pending && !canSubmit) missingHeading.focus(); return; }
      onSubmit();
    } },
    submitting ? t.check.submitting : t.check.submit,
  );
  const error = h("p", { class: "error", role: "alert", hidden: !submitError }, submitError ?? "");

  fill(
    root,
    h(
      "div",
      { class: "page-inner" },
      h("div", { class: "page-head" }, h("p", { class: "eyebrow" }, t.nav.review), heading, h("p", { class: "page-intro" }, t.check.intro)),
      banner,
      missingBox,
      h("section", { class: "review-section", "aria-labelledby": "rv-items" }, h("h3", { id: "rv-items" }, t.check.itemsTitle), items.length
        ? h("ul", { class: "review-list" }, items.map((i) => h("li", null, h("span", null, i.name), h("span", { class: "num" }, t.summary.line(i.quantity)))))
        : h("p", { class: "muted" }, t.check.noItems), hasAlcohol && h("p", { class: "locked-note" }, t.check.alcoholNote), edit("menu", t.check.change.menu)),
      h("section", { class: "review-section", "aria-labelledby": "rv-event" }, h("h3", { id: "rv-event" }, t.check.eventTitle), h("dl", null,
        row(L.type, typeName), row(L.date, formatDate(ev.date)), row(L.fulfillment, t.check.fulfillment[ev.fulfillment]), row(L.window, windowLabel),
        ev.fulfillment === "delivery" ? [row(L.city, cityName), row(L.address, ev.address)] : null, row(L.notes, ev.notes)), edit("event", t.check.change.event)),
      h("section", { class: "review-section", "aria-labelledby": "rv-contact" }, h("h3", { id: "rv-contact" }, t.check.contactTitle), h("dl", null, row(L.name, ct.name), row(L.phone, ct.phone))),
      h("section", { class: "review-section", "aria-labelledby": "rv-guests" }, h("h3", { id: "rv-guests" }, t.check.guestsTitle), h("dl", null,
        row(L.adults, String(gu.adults)), row(L.children, String(gu.children)), row(L.vegetarian, String(gu.vegetarian)), row(L.vegan, String(gu.vegan)),
        row(L.other, String(gu.other)), row(L.dietaryNotes, gu.notes)), edit("guests", t.check.change.guests)),
      h("section", { class: "review-section", "aria-labelledby": "rv-price" }, h("h3", { id: "rv-price" }, t.check.priceTitle), h("p", { class: "price-line" }, t.check.priceValue), h("p", { class: "muted" }, t.check.priceNote)),
      h("div", { class: "submit-area" },
        pending ? h("p", { class: "locked-note" }, t.check.locked) : [submit, h("p", { class: "muted", id: "submit-note" }, canSubmit ? t.check.submitNote : t.check.cantSubmit), error]),
    ),
  );
  return { heading, missingHeading };
}
