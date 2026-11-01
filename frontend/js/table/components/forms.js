// Small form toolkit: every control gets a visible label, optional help text, and an error message that is
// associated with it (aria-describedby + aria-invalid). Errors arrive as CODES and are worded by the caller.
import { h } from "../../lib/dom.js";

const describedBy = (...ids) => ids.filter(Boolean).join(" ");

export function field({ id, label, help, required = false, build }) {
  const helpId = help ? `${id}-help` : null;
  const errId = `${id}-error`;
  const error = h("p", { class: "field-error", id: errId, hidden: true });
  const control = build({ id, "aria-describedby": describedBy(helpId, errId), ...(required ? { "aria-required": "true" } : {}) });
  const el = h(
    "div",
    { class: "field" },
    h("label", { for: id }, label, required && h("span", { class: "req" }, " (required)")),
    help && h("p", { class: "field-help", id: helpId }, help),
    control,
    error,
  );
  return {
    el, control, label,
    getValue: () => control.value,
    setError(message) {
      error.hidden = !message;
      error.textContent = message ?? "";
      control.toggleAttribute("aria-invalid", !!message);
      if (message) control.setAttribute("aria-invalid", "true");
    },
    focus: () => control.focus(),
  };
}

export const textInput = (attrs = {}) => (a) => h("input", { type: "text", ...attrs, ...a });
export const numberInput = (attrs = {}) => (a) => h("input", { type: "number", inputmode: "numeric", min: "0", step: "1", ...attrs, ...a });
export const textArea = (attrs = {}) => (a) => h("textarea", { rows: "3", ...attrs, ...a });
export const selectInput = (options, value, placeholder) => (a) =>
  h(
    "select",
    a,
    placeholder && h("option", { value: "" }, placeholder),
    options.map((o) => h("option", { value: o.id, selected: o.id === value }, o.name)),
  );

/** A radio group as a labelled fieldset. */
export function radioGroup({ id, label, options, value, required = false }) {
  const errId = `${id}-error`;
  const error = h("p", { class: "field-error", id: errId, hidden: true });
  const inputs = options.map((o) =>
    h("label", { class: "choice" }, h("input", { type: "radio", name: id, value: o.id, checked: o.id === value }), h("span", null, o.name)),
  );
  const el = h("fieldset", { class: "field", "aria-describedby": errId }, h("legend", null, label, required && h("span", { class: "req" }, " (required)")), h("div", { class: "choices" }, inputs), error);
  const radios = () => [...el.querySelectorAll("input[type=radio]")];
  return {
    el, label,
    control: el,
    getValue: () => radios().find((r) => r.checked)?.value ?? null,
    onChange: (fn) => radios().forEach((r) => r.addEventListener("change", fn)),
    setError(message) {
      error.hidden = !message;
      error.textContent = message ?? "";
    },
    focus: () => (radios().find((r) => r.checked) ?? radios()[0]).focus(),
  };
}

/** "N fields need attention" with one button per problem that jumps to its field. Returns { el, heading }. */
export function errorSummary(t, problems) {
  const heading = h("h3", { tabindex: "-1" }, t.form.errorsTitle(problems.length));
  const el = h(
    "div",
    { class: "error-summary", role: "alert" },
    heading,
    h("ul", null, problems.map((p) => h("li", null, h("button", { type: "button", class: "link-btn", onclick: () => p.field.focus() }, `${p.field.label}: ${p.message}`)))),
  );
  return { el, heading };
}
