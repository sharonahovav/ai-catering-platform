import { h, fill } from "../../lib/dom.js";
import { errorSummary, field, radioGroup, selectInput, textArea, textInput } from "./forms.js";

// Event details. Saving is explicit (never autosave) and may be partial: completeness is only checked when the
// person asks for a quote, and that check lives on the server (order.readiness), not here.
export function renderEventForm(root, { t, order, eventTypes, draft, locked, onSave, onDirty }) {
  const heading = h("h2", { id: "page-heading", tabindex: "-1" }, t.event.title);
  const head = h("div", { class: "page-head" }, h("p", { class: "eyebrow" }, t.nav.event), heading, h("p", { class: "page-intro" }, t.event.intro));

  if (locked) {
    fill(root, h("div", { class: "page-inner" }, head, h("p", { class: "locked-note" }, t.form.locked), h("a", { class: "btn btn-ghost", href: "#/plan/review" }, t.form.seeReview)));
    return { heading, showErrors() {}, setSaving() {} };
  }

  const v = draft ?? order.event;
  const type = field({ id: "event-type", label: t.event.type, required: true, build: selectInput(eventTypes, v.type, t.event.typePlaceholder) });
  const date = field({ id: "event-date", label: t.event.date, help: t.event.dateHelp, required: true, build: textInput({ type: "date", value: v.date ?? "" }) });
  const fulfillment = radioGroup({ id: "event-fulfillment", label: t.event.fulfillment, required: true, value: v.fulfillment, options: [{ id: "pickup", name: t.event.pickup }, { id: "delivery", name: t.event.delivery }] });
  const address = field({ id: "event-address", label: t.event.address, help: t.event.addressHelp, required: true, build: textInput({ value: v.address ?? "", maxlength: "200", autocomplete: "street-address" }) });
  const time = field({ id: "event-time", label: t.event.time, help: t.event.timeHelp, build: textInput({ value: v.requestedTime ?? "", maxlength: "40" }) });
  const notes = field({ id: "event-notes", label: t.event.notes, build: textArea({ maxlength: "500" }) });
  notes.control.value = v.notes ?? "";

  const addressWrap = h("div", { class: "conditional" }, address.el);
  const syncAddress = () => { addressWrap.hidden = fulfillment.getValue() !== "delivery"; };
  const fields = { "event.type": type, "event.date": date, "event.fulfillment": fulfillment, "event.address": address, "event.requestedTime": time, "event.notes": notes };

  const values = () => ({
    type: type.getValue() || null,
    date: date.getValue() || null,
    fulfillment: fulfillment.getValue(),
    address: address.getValue(),
    requestedTime: time.getValue(),
    notes: notes.getValue(),
  });

  const status = h("p", { class: "form-status" });
  const summarySlot = h("div");
  const save = h("button", { class: "btn btn-primary", type: "submit" }, t.form.save);
  const form = h("form", { class: "form", novalidate: true }, type.el, date.el, fulfillment.el, addressWrap, time.el, notes.el, h("div", { class: "form-actions" }, save, status));
  syncAddress();

  const markDirty = () => { status.textContent = t.form.unsaved; onDirty(values()); };
  form.addEventListener("input", markDirty);
  form.addEventListener("change", markDirty);
  fulfillment.onChange(syncAddress);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (save.getAttribute("aria-disabled") === "true") return;
    onSave({ event: values() });
  });

  fill(root, h("div", { class: "page-inner" }, head, summarySlot, form));

  return {
    heading,
    setSaving(on) {
      save.setAttribute("aria-disabled", String(on));
      save.textContent = on ? t.form.saving : t.form.save;
    },
    /** `codes` = { "event.date": "past", ... } from the server. */
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
