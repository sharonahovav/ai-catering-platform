import { h } from "../../lib/dom.js";

export function dishCard(dish, categoryId, t) {
  return h(
    "li",
    null,
    h(
      "article",
      { class: "dish-card" },
      h("div", { class: "dish-art" }, h("img", { src: dish.image, alt: dish.imageAlt, width: 512, height: 512, loading: "lazy", decoding: "async" })),
      h(
        "div",
        { class: "dish-info" },
        h("h3", null, dish.name),
        dish.description && h("p", null, dish.description),
        h("div", { class: "tags" }, h("span", { class: "tag" }, t.category.demoTag), !dish.available && h("span", { class: "tag tag-warn" }, t.category.unavailable), dish.alcohol && h("span", { class: "tag tag-warn" }, t.category.alcoholTag)),
        h(
          "button",
          { class: "btn btn-ghost", type: "button", "data-route": `#/plan/menu/${categoryId}/dish/${dish.id}`, "data-dish-id": dish.id, "aria-label": t.category.explore(dish.name) },
          t.category.exploreVisible,
          h("span", { "aria-hidden": "true" }, "+"),
        ),
      ),
    ),
  );
}
