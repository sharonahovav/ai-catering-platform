import { h, fill } from "../../lib/dom.js";
import { icon } from "./icons.js";

export function mountRail(root, { t, firstCategoryId }) {
  root.setAttribute("aria-label", t.nav.label);
  const link = (key, href) => h("a", { class: "rail-btn", href, "data-nav": key }, icon(key), h("span", null, t.nav[key]));

  const table = link("table", "#/plan");
  const menu = link("menu", `#/plan/menu/${firstCategoryId}`);
  const event = link("event", "#/plan/event");
  const guests = link("guests", "#/plan/guests");
  const review = link("review", "#/plan/review");
  fill(root, table, menu, event, guests, review);
  const current = { table, menu, event, guests, review };

  return {
    update(route) {
      const active = route.name === "overview" ? "table" : route.name === "category" || route.name === "dish" ? "menu" : route.name;
      for (const [key, el] of Object.entries(current)) {
        if (key === active) el.setAttribute("aria-current", "page");
        else el.removeAttribute("aria-current");
      }
    },
  };
}
