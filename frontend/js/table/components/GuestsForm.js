import { h, fill } from "../../lib/dom.js";
import { errorSummary, field, numberInput, textArea } from "./forms.js";

// Guest composition. Dietary groups are counts that may OVERLAP (a guest can be vegetarian and have another
// restriction), so they are each compared with the total and never added to it. The business rules for quantities
// are not configured, so nothing here is used to recommend amounts.
export function renderGuestsForm(root, { t, order, draft, locked, onSave, onDirty }) {
  const heading = h("h2", { id: "page-heading", tabindex: "-1" }, t.guests.title);
  const head = h("div", { class: "page-head" }, h("p", { class: "eyebrow" }, t.nav.guests), heading, h("p", { class: "page-intro" }, t.guests.intro));

  if (locked) {
    fill(root, h("div", { class: "page-inner" }, head, h("p", { class: "locked-note" }, t.form.locked), h("a", { class: "btn btn-ghost", href: "#/plan/review" }, t.form.seeReview)));
    return { heading, showErrors() {}, setSaving() {} };
  }

  const v = draft ?? order.guests;
  const num = (id, label, value, help) => field({ id, label, help, build: numberInput({ value: String(value ?? 0), max: "10000" }) });
  const adults = num("guests-adults", t.guests.adults, v.adults);
  const children = num("guests-children", t.guests.children, v.children);
  const vegetarian = num("guests-vegetarian", t.guests.vegetarian, v.vegetarian);
  const vegan = num("guests-vegan", t.guests.vegan, v.vegan);
  const other = num("guests-other", t.guests.other, v.other);
  const notes = field({ id: "guests-notes", label: t.guests.notes, help: t.guests.notesHelp, build: textArea({ maxlength: "500" }) });
  notes.control.value = v.notes ?? "";
  const fields = { "guests.adults": adults, "guests.children": children, "guests.vegetarian": vegetarian, "guests.vegan": vegan, "guests.other": other, "guests.notes": notes };

  const toInt = (f) => (f.getValue().trim() === "" ? 0 : Number(f.getValue()));
  const values = () => ({ adults: toInt(adults), children: toInt(children), vegetarian: toInt(vegetarian), vegan: toInt(vegan), other: toInt(other), notes: notes.getValue() });

  const total = h("p", { class: "guest-total num", "aria-live": "polite" });
  const syncTotal = () => { const n = toInt(adults) + toInt(children); total.textContent = t.guests.total(Number.isFinite(n) ? n : 0); };
  syncTotal();

  const status = h("p", { class: "form-status" });
  const summarySlot = h("div");
  const save = h("button", { class: "btn btn-primary", type: "submit" }, t.form.save);
  const form = h(
    "form",
    { class: "form", novalidate: true },
    h("div", { class: "field-row" }, adults.el, children.el),
    total,
    h("fieldset", { class: "field" }, h("legend", null, t.guests.dietaryTitle), h("p", { class: "field-help" }, t.guests.dietaryHelp), h("div", { class: "field-row" }, vegetarian.el, vegan.el, other.el)),
    notes.el,
    h("div", { class: "form-actions" }, save, status),
  );

  const markDirty = () => { syncTotal(); status.textContent = t.form.unsaved; onDirty(values()); };
  form.addEventListener("input", markDirty);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (save.getAttribute("aria-disabled") === "true") return;
    onSave({ guests: values() });
  });

  fill(root, h("div", { class: "page-inner" }, head, summarySlot, form));

  return {
    heading,
    setSaving(on) {
      save.setAttribute("aria-disabled", String(on));
      save.textContent = on ? t.form.saving : t.form.save;
    },
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
