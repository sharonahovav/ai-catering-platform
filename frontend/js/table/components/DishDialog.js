import { h, fill } from "../../lib/dom.js";

// Native <dialog>.showModal() gives us the focus trap, inert background and top layer. Escape and the backdrop
// are routed through `onClose` so closing goes through browser history (Back closes the sheet too).
export function mountDishDialog(dialog, { t, onClose, onStep, onAdd }) {
  let dish = null;
  let ui = null; // live nodes updated in place so focus is never lost

  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    onClose();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) onClose(); // click on the backdrop
  });

  function build() {
    const out = h("output", { class: "num" });
    const minus = h("button", { type: "button", "aria-label": t.dish.decrease, onclick: () => onStep(-1) }, "−");
    const plus = h("button", { type: "button", "aria-label": t.dish.increase, onclick: () => onStep(1) }, "+");
    const error = h("p", { class: "error", role: "alert", hidden: true });
    const add = h("button", { class: "btn btn-primary", type: "button", onclick: () => onAdd() }, t.dish.add);
    const note = h("p", { class: "hint", hidden: true }, t.dish.unavailableNote);
    const rule = dish.quantityRule;
    ui = { out, minus, plus, error, add, rule, note };

    fill(
      dialog,
      h(
        "div",
        { class: "dish-body" },
        h("div", { class: "dish-top" }, h("p", { class: "eyebrow" }, t.dish.eyebrow), h("button", { class: "icon-btn", type: "button", "aria-label": t.dish.close, onclick: () => onClose() }, h("span", { "aria-hidden": "true" }, "×"))),
        h("div", { class: "dish-visual" }, h("img", { src: dish.image, alt: dish.imageAlt, width: 512, height: 512 })),
        h("div", null, h("span", { class: "tag" }, t.dish.demoTag)),
        h("h2", { id: "dish-title" }, dish.name),
        dish.description && h("p", null, dish.description),
        h(
          "dl",
          { class: "facts" },
          h("dt", null, t.dish.price),
          h("dd", null, t.dish.priceValue),
          h("dt", null, t.dish.dietary),
          h("dd", null, t.dish.dietaryValue),
          h("dt", null, t.dish.availability),
          h("dd", null, dish.available ? t.dish.availableDemo : t.dish.unavailable),
        ),
        h(
          "div",
          { class: "qty" },
          h(
            "div",
            { class: "qty-row", role: "group", "aria-label": t.dish.qtyLabel },
            h("span", { class: "qty-label", "aria-hidden": "true" }, t.dish.qtyLabel),
            h("div", { class: "stepper" }, minus, out, plus),
          ),
          h("p", { class: "hint" }, t.dish.qtyHint),
          note,
          error,
          add,
        ),
      ),
    );
  }

  return {
    isOpen: () => dialog.open,
    currentDishId: () => dish?.id ?? null,

    open(nextDish, draft) {
      if (!dish || dish.id !== nextDish.id || !ui) {
        dish = nextDish;
        build();
      }
      this.update(draft);
      if (!dialog.open) dialog.showModal();
    },

    update(draft) {
      if (!ui || !draft) return;
      const { out, minus, plus, error, add, rule, note } = ui;
      out.textContent = t.dish.qtyValue(draft.quantity);
      minus.setAttribute("aria-disabled", String(rule.state !== "configured" || draft.quantity <= rule.min));
      plus.setAttribute("aria-disabled", String(rule.state !== "configured" || draft.quantity + rule.step > rule.max));
      const adding = draft.status === "adding";
      const blocked = !dish.available || rule.state !== "configured";
      note.hidden = dish.available;
      add.setAttribute("aria-disabled", String(blocked || adding));
      add.setAttribute("aria-busy", String(adding));
      add.textContent = adding ? t.dish.adding : draft.status === "error" ? t.dish.retry : t.dish.add;
      error.hidden = draft.status !== "error";
      error.textContent = draft.status === "error" ? draft.error : "";
    },

    close() {
      if (dialog.open) dialog.close();
    },
  };
}
