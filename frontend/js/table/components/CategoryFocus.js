import { h, fill } from "../../lib/dom.js";
import { dishCard } from "./DishCard.js";

// Re-rendered only when the focused category changes. Returns the heading so the caller can move focus to it.
export function renderCategory(root, { t, category, categories, dishes }) {
  const index = categories.findIndex((c) => c.id === category.id) + 1;
  const heading = h("h2", { id: "category-title", tabindex: "-1" }, category.name);
  fill(
    root,
    h("a", { class: "btn btn-ghost back-link", href: "#/plan" }, h("span", { "aria-hidden": "true" }, "←"), t.category.back),
    h(
      "div",
      { class: "focus-inner hud" },
      h(
        "div",
        { class: "focus-head" },
        h("div", null, h("p", { class: "eyebrow" }, t.category.eyebrow), heading, h("p", null, t.category.intro)),
        h("p", { class: "count num", "aria-hidden": "true" }, t.category.count(index, categories.length)),
      ),
      // Links to other categories, not filters: filtering needs verified dietary flags, which the mock doesn't have.
      h(
        "nav",
        { class: "chips", "aria-label": t.category.otherLabel },
        categories.map((c) => h("a", { class: "chip", href: `#/plan/menu/${c.id}`, "aria-current": c.id === category.id ? "true" : null }, c.name)),
      ),
      dishes.length
        ? h("ul", { class: "dish-grid", "aria-label": t.category.listLabel(category.name) }, dishes.map((d) => dishCard(d, category.id, t)))
        : h("p", { class: "muted" }, t.category.empty),
    ),
  );
  return heading;
}
