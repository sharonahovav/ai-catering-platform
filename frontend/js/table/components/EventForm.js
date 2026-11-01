import { h, fill } from "../../lib/dom.js";
import { errorSummary, field, radioGroup, selectInput, textArea, textInput } from "./forms.js";

// Event details plus the customer's contact details. Saving is explicit (never autosave) and may be partial:
// completeness is only checked when the person asks for a quote, and that check lives on the server (order.readiness).
// Cities, fees, time windows and notice come from the settings the owner configures (sample values in the demo).
export function renderEventForm(root, { t, order, eventTypes, settings, draft, locked, onSave, onDirty }) {
  const heading = h("h2", { id: "page-heading", tabindex: "-1" }, t.event.title);
  const head = h("div", { class: "page-head" }, h("p", { class: "eyebrow" }, t.nav.event), heading, h("p", { class: "page-intro" }, t.event.intro));

  if (locked) {
    fill(root, h("div", { class: "page-inner" }, head, h("p", { class: "locked-note" }, t.form.locked), h("a", { class: "btn btn-ghost", href: "#/plan/review" }, t.form.seeReview)));
    return { heading, showErrors() {}, setSaving() {} };
  }

  const v = draft ?? { contact: order.contact, event: order.event };
  const c = v.contact;
  const e = v.event;

  const name = field({ id: "contact-name", label: t.contact.name, required: true, build: textInput({ value: c.name ?? "", maxlength: "80", autocomplete: "name" }) });
  const phone = field({ id: "contact-phone", label: t.contact.phone, help: t.contact.phoneHelp, required: true, build: textInput({ type: "tel", inputmode: "tel", value: c.phone ?? "", maxlength: "20", autocomplete: "tel" }) });

  const type = field({ id: "event-type", label: t.event.type, required: true, build: selectInput(eventTypes, e.type, t.event.typePlaceholder) });
  const date = field({ id: "event-date", label: t.event.date, help: t.event.dateHelp, required: true, build: textInput({ type: "date", value: e.date ?? "" }) });
  const fulfillment = radioGroup({ id: "event-fulfillment", label: t.event.fulfillment, required: true, value: e.fulfillment, options: [{ id: "pickup", name: t.event.pickup }, { id: "delivery", name: t.event.delivery }] });
  const win = field({ id: "event-window", label: t.event.window, help: t.event.windowHelp, required: true, build: (a) => h("select", a) });
  const city = field({ id: "event-city", label: t.event.city, help: t.event.cityHelp, required: true, build: selectInput(settings.cities.map(({ id, name: n }) => ({ id, name: n })), e.city, t.event.cityPlaceholder) });
  const address = field({ id: "event-address", label: t.event.address, required: true, build: textInput({ value: e.address ?? "", maxlength: "200", autocomplete: "street-address" }) });
  const notes = field({ id: "event-notes", label: t.event.notes, build: textArea({ maxlength: "500" }) });
  notes.control.value = e.notes ?? "";

  // The time windows depend on pickup vs delivery, so they are rebuilt whenever that choice changes.
  function fillWindows(keep) {
    const list = settings.windows[fulfillment.getValue()] ?? [];
    const first = h("option", { value: "" }, list.length ? t.event.windowPlaceholder : t.event.windowFirst);
    win.control.replaceChildren(first, ...list.map((w) => h("option", { value: w.id, selected: w.id === keep }, w.label)));
  }
  fillWindows(e.window);

  const deliveryWrap = h("div", { class: "conditional field-row" }, city.el, address.el);
  const syncDelivery = () => { deliveryWrap.hidden = fulfillment.getValue() !== "delivery"; };
  const fields = {
    "contact.name": name, "contact.phone": phone,
    "event.type": type, "event.date": date, "event.fulfillment": fulfillment, "event.window": win, "event.city": city, "event.address": address, "event.notes": notes,
  };

  const values = () => {
    const delivery = fulfillment.getValue() === "delivery";
    return {
      contact: { name: name.getValue(), phone: phone.getValue() },
      event: {
        type: type.getValue() || null,
        date: date.getValue() || null,
        fulfillment: fulfillment.getValue(),
        window: win.getValue() || null,
        city: delivery ? city.getValue() || null : null,
        address: delivery ? address.getValue() : "",
        notes: notes.getValue(),
      },
    };
  };

  const status = h("p", { class: "form-status" });
  const summarySlot = h("div");
  const save = h("button", { class: "btn btn-primary", type: "submit" }, t.form.save);
  const form = h(
    "form",
    { class: "form", novalidate: true },
    h("fieldset", { class: "form-group" }, h("legend", null, t.contact.title), h("div", { class: "field-row" }, name.el, phone.el)),
    h("fieldset", { class: "form-group" }, h("legend", null, t.event.title), type.el, date.el, fulfillment.el, win.el, deliveryWrap, notes.el),
    h("div", { class: "form-actions" }, save, status),
  );
  syncDelivery();

  const markDirty = () => { status.textContent = t.form.unsaved; onDirty(values()); };
  form.addEventListener("input", markDirty);
  form.addEventListener("change", markDirty);
  fulfillment.onChange(() => { syncDelivery(); fillWindows(null); });
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    if (save.getAttribute("aria-disabled") === "true") return;
    onSave(values());
  });

  fill(root, h("div", { class: "page-inner" }, head, summarySlot, form));

  return {
    heading,
    setSaving(on) {
      save.setAttribute("aria-disabled", String(on));
      save.textContent = on ? t.form.saving : t.form.save;
    },
    /** `codes` = { "event.date": "blocked_day", ... } from the server. */
    showErrors(codes) {
      Object.values(fields).forEach((f) => f.setError(null));
      const problems = [];
      for (const [path, code] of Object.entries(codes ?? {})) {
        const f = fields[path];
        if (!f) continue;
        const message = t.fieldErrors[code] ?? t.fieldErrors.invalid;
        f.setError(message);
        problems.push({ field: f, message });
      }
      fill(summarySlot);
      if (problems.length) {
        const s = errorSummary(t, problems);
        summarySlot.append(s.el);
        s.heading.focus();
      }
    },
    saved() {
      status.textContent = t.form.saved;
      fill(summarySlot);
      Object.values(fields).forEach((f) => f.setError(null));
    },
  };
}
