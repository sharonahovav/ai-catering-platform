import { h, fill } from "../../lib/dom.js";
import { icon } from "./icons.js";

export function mountRail(root, { t, firstCategoryId }) {
  root.setAttribute("aria-label", t.nav.label);
  const link = (key, href) => h("a", { class: "rail-btn", href, "data-nav": key }, icon(key), h("span", null, t.nav[key]));
  // Event/Guests/Review are Gate 2: visible, labelled, and clearly not available (not hidden, not a dead link).
  const soon = (key) =>
    h("button", { class: "rail-btn", type: "button", "aria-disabled": "true" }, icon(key), h("span", null, t.nav[key]), h("span", { class: "soon" }, t.nav.soon));

  const table = link("table", "#/plan");
  const menu = link("menu", `#/plan/menu/${firstCategoryId}`);
  fill(root, table, menu, soon("event"), soon("guests"), soon("review"));

  return {
    update(route) {
      const inMenu = route.name === "category" || route.name === "dish";
      table.toggleAttribute("aria-current", route.name === "overview");
      if (route.name === "overview") table.setAttribute("aria-current", "page");
      menu.toggleAttribute("aria-current", inMenu);
      if (inMenu) menu.setAttribute("aria-current", "page");
    },
  };
}
